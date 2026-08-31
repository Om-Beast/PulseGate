import { Product } from '../types';

const products: Product[] = [
  {
    id: '1',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with Cherry MX switches',
    price: 8999,
    category: 'peripherals',
    inStock: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '2',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with 4000 DPI sensor',
    price: 1749,
    category: 'peripherals',
    inStock: true,
    createdAt: '2026-02-05T10:30:00Z',
  },
  {
    id: '3',
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with HDMI and ethernet',
    price: 4599,
    category: 'accessories',
    inStock: false,
    createdAt: '2026-03-18T14:15:00Z',
  },
  {
    id: '4',
    name: '27" 4K Monitor',
    description: 'IPS panel with 99% sRGB coverage',
    price: 32999,
    category: 'displays',
    inStock: true,
    createdAt: '2026-04-22T11:00:00Z',
  },
];

let nextId = 5;

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function createProduct(data: {
  name: string;
  description: string;
  price: number;
  category: string;
}): Product {
  const product: Product = {
    id: String(nextId++),
    name: data.name,
    description: data.description,
    price: data.price,
    category: data.category,
    inStock: true,
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  return product;
}
