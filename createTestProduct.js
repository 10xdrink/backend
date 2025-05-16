require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const { convertUsdToInr } = require('./utils/currencyUtils');

// Connect to database
const init = async () => {
  await connectDB();
  console.log('Connected to MongoDB');

  try {
    // First check if we already have products
    const existingProducts = await Product.countDocuments();
    console.log(`Current product count: ${existingProducts}`);

    if (existingProducts > 0) {
      console.log('Products already exist in the database. No need to create test product.');
      process.exit(0);
    }

    // Create a new test product with INR prices
    const testProduct = new Product({
      title: 'Test Energy Drink',
      description: 'This is a test energy drink with amazing flavor.',
      price: convertUsdToInr(2.99),
      stock: 100,
      discountPercentage: 0,
      brand: '10X',
      category: 'Beverages',
      thumbnail: 'https://via.placeholder.com/150',
      images: ['https://via.placeholder.com/800'],
      productBG: 'https://via.placeholder.com/1200',
      variants: [
        {
          size: '60ml',
          price: convertUsdToInr(2.99),
          stock: 50
        },
        {
          size: '120ml',
          price: convertUsdToInr(4.99),
          stock: 30
        }
      ],
      packaging: ['Bottle'],
      accordion: {
        details: 'This is a test product with amazing details.',
        shipping: 'Free shipping on orders over ₹4150.',
        returns: '30-day return policy.'
      },
      isActive: true
    });

    const savedProduct = await testProduct.save();
    console.log('Test product created successfully:');
    console.log(JSON.stringify(savedProduct, null, 2));

    // Create another product - Lime Charge with INR prices
    const limeChargeProduct = new Product({
      title: 'Lime Charge',
      description: 'A refreshing blend of lime and mango flavors designed to provide a balanced energy boost.',
      price: convertUsdToInr(3.51),
      stock: 200,
      discountPercentage: 0,
      brand: '10X',
      category: 'Beverages',
      thumbnail: 'https://via.placeholder.com/150',
      images: ['https://via.placeholder.com/800'],
      productBG: 'https://via.placeholder.com/1200',
      variants: [
        {
          size: '60ml',
          price: convertUsdToInr(3.51),
          stock: 100
        },
        {
          size: 'Pack of 2 (60ml)',
          price: convertUsdToInr(6.99),
          stock: 50
        }
      ],
      packaging: ['Bottle'],
      accordion: {
        details: 'Lime Charge is our signature energy drink with citrus flavors.',
        shipping: 'Free shipping on orders over ₹4150.',
        returns: '30-day return policy.'
      },
      isActive: true
    });

    const savedLimeProduct = await limeChargeProduct.save();
    console.log('Lime Charge product created successfully:');
    console.log(JSON.stringify(savedLimeProduct, null, 2));

    console.log('All test products created successfully!');
  } catch (error) {
    console.error('Error creating test product:', error);
  }

  // Disconnect from the database
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
};

init(); 