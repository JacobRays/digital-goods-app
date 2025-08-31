import React, { useState } from "react";

const StoreFront = ({ categories, products, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedProduct(null);
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="storefront">
      <button className="back-button" onClick={onBack}>
        Back to Admin Panel
      </button>

      {!selectedCategory && (
        <div className="categories">
          <h2>Categories</h2>
          <div className="category-list">
            {categories.map((category) => (
              <div
                key={category._id}
                className="category-item"
                onClick={() => handleCategorySelect(category)}
              >
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCategory && !selectedProduct && (
        <div className="products">
          <button className="back-button" onClick={handleBackToCategories}>
            Back to Categories
          </button>
          <h2>{selectedCategory.name} - Products</h2>
          <div className="product-list">
            {products
              .filter((product) => product.category === selectedCategory._id)
              .map((product) => (
                <div
                  key={product._id}
                  className="product-card"
                  onClick={() => handleProductSelect(product)}
                >
                  <img src={product.imageUrl} alt={product.name} />
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <p>${product.price}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="product-detail">
          <button className="back-button" onClick={handleBackToProducts}>
            Back to Products
          </button>
          <h2>{selectedProduct.name}</h2>
          <img src={selectedProduct.imageUrl} alt={selectedProduct.name} />
          <p>{selectedProduct.description}</p>
          <p>Price: ${selectedProduct.price}</p>
          <button className="buy-button">Buy Now</button>
        </div>
      )}
    </div>
  );
};

export default StoreFront;
