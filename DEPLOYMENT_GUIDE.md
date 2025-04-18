# Deployment Guide for Product Search ERP

This guide will help you deploy the Product Search ERP system with minimal technical knowledge.

## Option 1: Heroku Deployment (Recommended for Beginners)

Heroku is a cloud platform that makes it easy to deploy, manage, and scale applications.

### Step 1: Create a Heroku Account

1. Go to [Heroku](https://signup.heroku.com/) and sign up for a free account
2. Verify your email address

### Step 2: Set Up Your Application

1. Download and extract the Product Search ERP files
2. Create a new GitHub account if you don't have one at [GitHub](https://github.com/join)
3. Create a new repository and upload the files

### Step 3: Connect Heroku to GitHub

1. Log in to your Heroku dashboard
2. Click "New" and select "Create new app"
3. Give your app a name and click "Create app"
4. Go to the "Deploy" tab
5. Select "GitHub" as the deployment method
6. Connect your GitHub account
7. Search for and select your repository

### Step 4: Configure Database

1. Go to the "Resources" tab
2. In the "Add-ons" section, search for "MongoDB Atlas"
3. Select the free plan and provision it

### Step 5: Configure Environment Variables

1. Go to the "Settings" tab
2. Click "Reveal Config Vars"
3. Add the following variables:
   - JWT_SECRET: (create a random string)
   - NODE_ENV: production

### Step 6: Deploy

1. Go back to the "Deploy" tab
2. Scroll down to "Manual deploy"
3. Select the main branch and click "Deploy Branch"
4. Wait for the deployment to complete
5. Click "View" to see your application

### Step 7: Import Data

1. Go to the "More" dropdown in the top right
2. Select "Run console"
3. Type `node importData.js -u` to create the admin user
4. Type `node importData.js -d` to import product data

## Option 2: Vercel Deployment

Vercel is another platform that's easy to use for deployment.

### Step 1: Create a Vercel Account

1. Go to [Vercel](https://vercel.com/signup) and sign up with GitHub
2. Follow the onboarding process

### Step 2: Import Your GitHub Repository

1. Click "Import Project"
2. Select "Import Git Repository"
3. Select your GitHub repository
4. Configure the project settings
5. Click "Deploy"

### Step 3: Configure Environment Variables

1. Go to your project settings
2. Navigate to the "Environment Variables" section
3. Add the same variables as in the Heroku deployment

## Accessing Your Application

After deployment, you can access your application at the URL provided by Heroku or Vercel.

Default admin credentials:
- Email: admin@example.com
- Password: admin123

Change these credentials immediately after your first login!

## Getting Help

If you encounter any issues during deployment, please contact technical support for assistance.
