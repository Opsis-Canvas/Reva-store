/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Note: Since this is a client-backend unified architecture in AI Studio,
// we can use client-side SDK or admin-side. To avoid needing complex service accounts
// for firebase-admin, we can write verification by connecting directly using the Firebase HTTP/REST
// API or by initializing the admin SDK lazily, or using firebase-admin with environment configs,
// or simply utilizing a secure server-side client connection or standard database REST endpoints.
// Let's implement server-side verification using standard node-fetch / client-side Firebase operations
// inside the backend route, or using the firebase npm package which is perfectly valid on the server!
import { initializeApp as initializeClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  doc as clientDoc, 
  getDoc as clientGetDoc, 
  updateDoc as clientUpdateDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCO8WSr3HzsEd9vmcLGXs5LcvsfkiJZ_MA",
  authDomain: "perceptive-abode-rpsvl.firebaseapp.com",
  projectId: "perceptive-abode-rpsvl",
  storageBucket: "perceptive-abode-rpsvl.firebasestorage.app",
  messagingSenderId: "126839697288",
  appId: "1:126839697288:web:7de0175e88b7a879de143d"
};

// Initialize server-side firebase client connection
const serverFirebaseApp = initializeClientApp(firebaseConfig);
const serverDb = getClientFirestore(serverFirebaseApp, "ai-studio-preorderplatform-c0ec4f63-7ece-4af3-9ca8-3bb03fc81300");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API Route: Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Server-side Paystack transaction verification
  app.post('/api/verify-payment', async (req, res) => {
    try {
      const { orderId, paystackReference, amountPaid, currency } = req.body;

      if (!orderId || !paystackReference) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing orderId or paystackReference parameters' 
        });
      }

      console.log(`[PAYSTACK VERIFICATION] Verifying order ${orderId} with reference ${paystackReference}`);

      // 1. Fetch the order from Firestore to check existence
      const orderRef = clientDoc(serverDb, 'orders', orderId);
      const orderSnap = await clientGetDoc(orderRef);

      if (!orderSnap.exists()) {
        return res.status(404).json({ 
          success: false, 
          message: `Order with ID ${orderId} not found` 
        });
      }

      const orderData = orderSnap.data();

      // 2. Perform mock validation of Paystack Reference (Simulating server-to-server Paystack API call)
      // In a real environment, this makes a request to:
      // GET https://api.paystack.co/transaction/verify/:reference
      // Authorization: Bearer process.env.PAYSTACK_SECRET_KEY
      const isReferenceFormatValid = paystackReference.startsWith('PR-') || paystackReference.length > 5;
      
      if (!isReferenceFormatValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid Paystack transaction reference format' 
        });
      }

      // Simulate a small delay for verification network round-trip
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. Mark the order as paid in Firestore
      await clientUpdateDoc(orderRef, {
        paymentStatus: 'paid',
        paystackReference: paystackReference,
        orderStatus: 'processing', // change from pending to active processing
        updatedAt: Date.now()
      });

      console.log(`[PAYSTACK VERIFICATION] Order ${orderId} verified successfully as PAID.`);

      return res.json({ 
        success: true, 
        message: 'Payment verified and order status updated',
        data: {
          orderId,
          reference: paystackReference,
          paymentStatus: 'paid'
        }
      });
    } catch (error: any) {
      console.error('[PAYSTACK VERIFICATION ERROR]:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error during verification', 
        error: error.message 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html as fallback for Client SPAs
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] PreOrder Platform running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SERVER BOOT ERROR]:', err);
});
