import express from "express";
import { createProduct, deleteProduct, updateProduct, getProducts } from "../controllers/Product";

const productRouter = express.Router();

productRouter.post('/', createProduct);
productRouter.get('/', getProducts);
productRouter.put('/:id', updateProduct);
productRouter.delete('/:id', deleteProduct);

export default productRouter;

