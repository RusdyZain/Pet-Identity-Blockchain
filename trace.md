# PetRegistered Event Trace

This trace shows where the `PetRegistered` event is emitted and where the backend consumes it.

```mermaid
flowchart TD
  A["PetIdentityRegistry.registerPet(dataHash)"] -->|emit PetRegistered| B["PetRegistered event"]
  C["API Controller: createPetController"] -->|calls confirmRegisterPetTx| D["petIdentityClient.confirmRegisterPetTx"]
  D -->|reads tx receipt from RPC| E["parseEventFromReceipt(txHash, PetRegistered)"]
  E -->|validates event fields| F["confirmRegisterPetTx returns onChainPetId"]
  F -->|save DB record| G["petService.createPet"]
  H["User submits pet form"] --> I["MetaMask tx to registerPet"]
  I -->|returns txHash| C
  A -->|transaction mined| E
```

## Detailed trace

1. `PetIdentityRegistry.registerPet(bytes32 dataHash)` is called on-chain by the wallet owner.
2. The contract emits the `PetRegistered` event inside `registerPet`.
3. Frontend submits the transaction and receives a `txHash` from MetaMask.
4. Backend receives that `txHash` in `createPetController`.
5. `createPetController` calls `confirmRegisterPetTx(...)` in `backend/src/blockchain/petIdentityClient.ts`.
6. `confirmRegisterPetTx` calls `parseEventFromReceipt(txHash, "PetRegistered")` and validates:
   - the transaction sender matches the authenticated wallet
   - the returned `dataHash` matches the expected pet hash
7. If validation passes, backend persists the pet record in the database.

## Notes

- There is no separate on-chain event listener in the backend; the backend consumes the event by parsing the transaction receipt after the tx is mined.
- The event is used as proof that `registerPet` successfully executed and that the on-chain data matches the submitted payload.
