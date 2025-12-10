import { Router, Request, Response } from 'express';
import { registerPet, getPet } from '../blockchain/petIdentityClient';

const router = Router();

router.post('/debug/register-pet', async (req: Request, res: Response) => {
  try {
    const { publicId, name, species, breed, birthDate } = req.body;
    const receipt = await registerPet(publicId, name, species, breed, Number(birthDate));
    return res.json({ txHash: receipt.hash });
  } catch (error: any) {
    console.error('Failed to register pet via blockchain:', error);
    return res.status(500).json({ error: error?.message ?? 'Internal server error' });
  }
});

router.get('/debug/pet/:id', async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.id);
    const pet = await getPet(petId);
    return res.json(pet);
  } catch (error: any) {
    console.error('Failed to fetch pet via blockchain:', error);
    return res.status(500).json({ error: error?.message ?? 'Internal server error' });
  }
});

export default router;

// Usage example:
// import debugBlockchainRouter from './routes/debugBlockchain';
// app.use('/api', debugBlockchainRouter);
