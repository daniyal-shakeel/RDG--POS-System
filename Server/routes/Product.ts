import express from "express";
import { createProduct, deleteProduct, updateProduct, getProduct } from "../controllers/Product";

const productRouter = express.Router();

productRouter.post('/', createProduct);
productRouter.get('/', getProduct);
productRouter.put('/:id', updateProduct);
productRouter.delete('/:id', deleteProduct);

export default productRouter;

