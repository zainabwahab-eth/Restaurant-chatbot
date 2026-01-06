# Restaurant ChatBot

🍽️ **Zainab Restaurant ChatBot** is a Node.js-based web application that allows users to interact with a restaurant menu, place orders, view order history, and make payments via Paystack. The chatbot uses a backend-driven conversational interface, with all user inputs processed through a single `/chat` endpoint, and integrates a Paystack popup for secure payments.

## 🚀 Deployed Application

Try the live demo at: [Zainab Restaurant ChatBot](https://eight-peace.pipeops.app/)

## 📋 Features

- **Interactive Menu**: Browse categories (Main Dishes, Snacks, Beverages, Desserts) and select items to add to your cart.
- **Order Management**:
  - View current order (`97`)
  - View order history (`98`)
  - Cancel current order (`0`)
- **Checkout & Payment**:
  - Initiate checkout (`99`) with email validation
  - Secure payment processing using Paystack popup
  - Payment verification on the backend to ensure integrity
- **Session Persistence**: Maintains user sessions using MongoDB and localStorage for a seamless experience.
- **Responsive UI**: Simple chat interface for user inputs and bot responses.

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js, MongoDB (with Mongoose), Axios (for Paystack API calls)
- **Frontend**: Vanilla JavaScript, HTML, CSS, Paystack Inline JS
- **Database**: MongoDB for storing sessions and orders
- **Payment Gateway**: Paystack for secure transactions
- **Environment**: dotenv for configuration management
- **Deployment**: Hosted on PipeOps

## 📦 Installation

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud, e.g., MongoDB Atlas)
- Paystack account (for API keys)

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/zainabwahab-eth/Restaurant-chatbot
   cd restaurant-chatbot
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Install Dependencies**
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
   PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
   NODE_ENV=development
   ```

Replace your_mongodb_connection_string with your MongoDB URI (e.g., mongodb://localhost/restaurant or Atlas URI).

Get PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY from your Paystack dashboard (test mode).

3. **Run the Application**
   ```bash
   npm start
   ```

## 🖥️ Usage

Open the app in a browser (http://localhost:3000 or deployed URL).
Interact with the chatbot:

- Select a category (e.g., 1 for Main Dishes).
- Choose an item and specify quantity.
- Use 97 to view current order, 98 for order history, 99 to checkout, or 0 to cancel.

During checkout:

- Enter a valid email when prompted.
- Complete payment via the Paystack popup.
- The backend verifies the payment and confirms the order.
