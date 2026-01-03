import { Request, Response } from 'express';

export const createProduct = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product created successfully' });
}

export const deleteProduct = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product deleted successfully' });
}

export const updateProduct = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product updated successfully' });
}

export const getProduct = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Product fetched successfully' });
}

