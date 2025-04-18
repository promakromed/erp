# Product Search ERP System

This is a multi-user web-based ERP system for product search and comparison.

## Features

- User authentication with JWT
- Secure API endpoints
- Product search functionality
- Price comparison between suppliers
- Responsive design for mobile and desktop

## Deployment Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Local Development Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     PORT=5000
     MONGO_URI=mongodb://localhost:27017/product_search
     JWT_SECRET=your_jwt_secret_key
     NODE_ENV=development
     ```
4. Import product data:
   ```
   node importData.js -d
   ```
5. Create admin user:
   ```
   node importData.js -u
   ```
6. Start the development server:
   ```
   npm run dev
   ```
7. Access the application at `http://localhost:5000`

### Production Deployment on Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku:
   ```
   heroku login
   ```
4. Create a new Heroku app:
   ```
   heroku create your-app-name
   ```
5. Add MongoDB Atlas as an add-on or set up your own MongoDB instance
6. Set environment variables:
   ```
   heroku config:set MONGO_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_jwt_secret_key
   heroku config:set NODE_ENV=production
   ```
7. Deploy the application:
   ```
   git push heroku main
   ```
8. Import data (you'll need to modify the import script to work with your production database)
9. Access your application at `https://your-app-name.herokuapp.com`

## Default Admin User

- Email: admin@example.com
- Password: admin123

Change these credentials immediately after first login!

## API Documentation

### Authentication

- POST /api/users/login - Login user
- POST /api/users - Register new user
- GET /api/users/profile - Get user profile (protected)

### Products

- POST /api/products/search - Search products by item numbers (protected)
- GET /api/products - Get all products with pagination (protected)
- GET /api/products/:id - Get product by ID (protected)

## Future Enhancements

- Add more manufacturers
- Implement PI and PO creation
- Add reporting features
- Implement user roles and permissions
- Add inventory management
