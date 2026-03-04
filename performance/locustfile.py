import os
import random
import threading
from datetime import date

from eth_account import Account
from eth_account.messages import encode_defunct
from locust import HttpUser, between, task
from web3 import Web3


API_HOST = os.getenv("API_URL", "http://localhost:4000")
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CHAIN_ID = int(os.getenv("CHAIN_ID", "0"))
TX_GAS_LIMIT = int(os.getenv("TX_GAS_LIMIT", "900000"))
TX_TIMEOUT_SEC = int(os.getenv("TX_TIMEOUT_SEC", "120"))
OWNER_PRIVATE_KEYS = [
    item.strip()
    for item in os.getenv("OWNER_PRIVATE_KEYS", "").split(",")
    if item.strip()
]
CLINIC_PRIVATE_KEYS = [
    item.strip()
    for item in os.getenv("CLINIC_PRIVATE_KEYS", "").split(",")
    if item.strip()
]

w3 = Web3(Web3.HTTPProvider(RPC_URL))
if CHAIN_ID == 0:
    CHAIN_ID = int(w3.eth.chain_id)


class NonceManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.next_nonce = {}

    def pop(self, address: str) -> int:
        with self.lock:
            chain_nonce = int(w3.eth.get_transaction_count(address, "pending"))
            cached = self.next_nonce.get(address, chain_nonce)
            nonce = max(chain_nonce, cached)
            self.next_nonce[address] = nonce + 1
            return nonce


NONCE_MANAGER = NonceManager()
PETS_POOL = []
PETS_POOL_LOCK = threading.Lock()
OWNER_KEY_CURSOR = 0
CLINIC_KEY_CURSOR = 0
KEY_CURSOR_LOCK = threading.Lock()


def next_private_key(role: str) -> str:
    global OWNER_KEY_CURSOR
    global CLINIC_KEY_CURSOR

    keys = OWNER_PRIVATE_KEYS if role == "OWNER" else CLINIC_PRIVATE_KEYS
    if not keys:
        raise RuntimeError(f"No private keys configured for role {role}")

    with KEY_CURSOR_LOCK:
        if role == "OWNER":
            idx = OWNER_KEY_CURSOR % len(keys)
            OWNER_KEY_CURSOR += 1
        else:
            idx = CLINIC_KEY_CURSOR % len(keys)
            CLINIC_KEY_CURSOR += 1
    return keys[idx]


def build_auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


class WalletLocustUser(HttpUser):
    host = API_HOST
    wait_time = between(1, 3)
    role = "OWNER"

    def on_start(self):
        self.private_key = next_private_key(self.role)
        self.account = Account.from_key(self.private_key)
        self.wallet_address = self.account.address
        self.token = self.login_or_register()

    def sign_challenge(self, message: str) -> str:
        signed = Account.sign_message(encode_defunct(text=message), self.private_key)
        return signed.signature.hex()

    def request_challenge(self) -> dict:
        response = self.client.post(
            "/auth/wallet/challenge",
            json={"walletAddress": self.wallet_address},
            name="auth.wallet.challenge",
        )
        response.raise_for_status()
        return response.json()

    def login_once(self) -> str:
        challenge = self.request_challenge()
        signature = self.sign_challenge(challenge["message"])
        response = self.client.post(
            "/auth/login",
            json={
                "walletAddress": self.wallet_address,
                "message": challenge["message"],
                "signature": signature,
            },
            name="auth.wallet.login",
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Login failed: {response.status_code} {response.text}")
        return response.json()["token"]

    def register_once(self):
        challenge = self.request_challenge()
        signature = self.sign_challenge(challenge["message"])
        suffix = self.wallet_address[-8:].lower()
        today = date.today().isoformat().replace("-", "")
        payload = {
            "name": f"Loadtest {self.role} {suffix}",
            "email": f"{self.role.lower()}_{suffix}_{today}@loadtest.local",
            "role": self.role,
            "walletAddress": self.wallet_address,
            "message": challenge["message"],
            "signature": signature,
        }
        response = self.client.post(
            "/auth/register",
            json=payload,
            name="auth.wallet.register",
        )
        if response.status_code not in (200, 201, 400):
            response.raise_for_status()

    def login_or_register(self) -> str:
        try:
            return self.login_once()
        except RuntimeError as error:
            if "404" not in str(error):
                raise
            self.register_once()
            return self.login_once()

    def send_prepared_transaction(self, tx_request: dict) -> str:
        nonce = NONCE_MANAGER.pop(self.wallet_address)
        gas_price = int(w3.eth.gas_price)
        tx = {
            "to": tx_request["to"],
            "data": tx_request["data"],
            "value": 0,
            "chainId": CHAIN_ID,
            "nonce": nonce,
            "gas": TX_GAS_LIMIT,
            "gasPrice": gas_price,
        }

        signed = Account.sign_transaction(tx, self.private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=TX_TIMEOUT_SEC)
        if int(receipt["status"]) != 1:
            raise RuntimeError(f"On-chain tx failed: {tx_hash.hex()}")
        return tx_hash.hex()


class OwnerOnChainUser(WalletLocustUser):
    role = "OWNER"

    @task
    def create_pet_flow(self):
        payload = {
            "name": f"Pet-{random.randint(1000, 9999)}",
            "species": "Cat",
            "breed": "Domestic",
            "birth_date": "2022-01-01",
            "color": random.choice(["Black", "White", "Orange"]),
            "physical_mark": f"mark-{random.randint(100, 999)}",
        }
        headers = build_auth_headers(self.token)

        prepare = self.client.post(
            "/pets/prepare-registration",
            json=payload,
            headers=headers,
            name="pets.prepare_registration",
        )
        prepare.raise_for_status()
        prepared = prepare.json()

        tx_hash = self.send_prepared_transaction(prepared["txRequest"])

        create = self.client.post(
            "/pets",
            json={
                **payload,
                "publicId": prepared["publicId"],
                "txHash": tx_hash,
            },
            headers=headers,
            name="pets.create_with_txhash",
        )
        create.raise_for_status()
        body = create.json()
        pet_id = int(body["pet"]["id"])

        with PETS_POOL_LOCK:
            PETS_POOL.append(pet_id)

        self.client.get(f"/pets/{pet_id}", headers=headers, name="pets.detail")


class ClinicOnChainUser(WalletLocustUser):
    role = "CLINIC"

    @task
    def medical_record_flow(self):
        with PETS_POOL_LOCK:
            if not PETS_POOL:
                return
            pet_id = random.choice(PETS_POOL)

        headers = build_auth_headers(self.token)
        payload = {
            "vaccine_type": random.choice(["Rabies", "Distemper", "Parvo"]),
            "batch_number": f"B-{random.randint(10000, 99999)}",
            "given_at": "2025-12-01",
            "notes": "load test",
            "evidence_url": "https://example.com/evidence",
        }

        prepare_create = self.client.post(
            f"/pets/{pet_id}/medical-records/prepare",
            json=payload,
            headers=headers,
            name="medical.prepare_create",
        )
        if prepare_create.status_code >= 400:
            return
        prepared = prepare_create.json()
        tx_hash_create = self.send_prepared_transaction(prepared["txRequest"])

        create = self.client.post(
            f"/pets/{pet_id}/medical-records",
            json={**payload, "txHash": tx_hash_create},
            headers=headers,
            name="medical.create_with_txhash",
        )
        create.raise_for_status()
        record_id = int(create.json()["record"]["id"])

        prepare_verify = self.client.patch(
            f"/medical-records/{record_id}/verify/prepare",
            json={"status": "VERIFIED"},
            headers=headers,
            name="medical.prepare_verify",
        )
        prepare_verify.raise_for_status()
        prepared_verify = prepare_verify.json()
        tx_hash_verify = self.send_prepared_transaction(prepared_verify["txRequest"])

        verify = self.client.patch(
            f"/medical-records/{record_id}/verify",
            json={"status": "VERIFIED", "txHash": tx_hash_verify},
            headers=headers,
            name="medical.verify_with_txhash",
        )
        verify.raise_for_status()


# Keep users balanced between OWNER and CLINIC flows.
OwnerOnChainUser.weight = 1
ClinicOnChainUser.weight = 1
