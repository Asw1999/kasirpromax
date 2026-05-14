import { useState } from 'react';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import ImportModal from './ImportModal';

export default function InventoryView() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleEdit = (productId: string) => {
    setEditingId(productId || '');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h1 className="text-2xl font-bold">📦 Manajemen Stok</h1>
        <p className="text-blue-100">Kelola produk dan stok warung</p>
      </div>

      <ProductList onEdit={handleEdit} onImport={() => setIsImportOpen(true)} />

      <ProductForm isOpen={isFormOpen} onClose={handleCloseForm} productId={editingId || undefined} />

      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
