import { Request, Response } from 'express';

export const createReceipt = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Receipt created successfully' });
}

export const deleteReceipt = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Receipt deleted successfully' });
}

export const updateReceipt = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Receipt updated successfully' });
}

export const getReceipt = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Receipt fetched successfully' });
}

