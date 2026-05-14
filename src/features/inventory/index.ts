export { default as InventoryView } from './InventoryView';
export { default as ProductList } from './ProductList';
export { default as ProductForm } from './ProductForm';
export { default as ImportModal } from './ImportModal';
export { createProduct, updateProduct, softDeleteProduct, importProducts } from './productService';
export type { ProductInput, ImportMode } from './productService';
