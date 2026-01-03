import { Request, Response } from 'express';

export const createInvoice = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Invoice created successfully' });
}

export const deleteInvoice = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Invoice deleted successfully' });
}

export const updateInvoice = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Invoice updated successfully' });
}

export const getInvoice = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Invoice fetched successfully' });
}

