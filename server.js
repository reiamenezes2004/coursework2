const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');

// Middleware
app.use(express.json());

// Define the directory where lesson images are stored
const imagesDir = path.resolve(__dirname, 'images');

// Middleware to serve static files (lesson images)
app.use('/images', express.static(imagesDir));

// Logger middleware function
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // Pass control to the next middleware function
});

// CORS middleware
const corsOptions = {
    origin: 'https://reiamenezes2004.github.io', // Update with your frontend origin
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: 'Content-Type, Authorization',
};
app.use(cors(corsOptions));

let db;

MongoClient.connect('mongodb+srv://reia2004:reia1326@cluster0.ykxntib.mongodb.net/', (err, client) => {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }
    console.log('Connected to MongoDB');
    db = client.db('afterschoolactivities');
});

app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((err, results) => {
        if (err) return next(err);
        res.send(results);
    });
});

app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insertOne(req.body, (err, result) => {
        if (err) {
            console.error('Error adding item to cart:', err);
            return res.status(500).json({ error: "Error adding item to cart" });
        }
        res.status(200).json({ message: "Item added to cart successfully" });
    });
});

app.post('/orders', (req, res) => {
    const order = req.body;

    if (!order || !order.cartItems || !Array.isArray(order.cartItems)) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const orderedLessons = order.cartItems.map(item => item.title);
    order.lessonsOrdered = orderedLessons;

    db.collection('orders').insertOne(order, (err, result) => {
        if (err) {
            console.error('Error inserting order into database:', err);
            return res.status(500).json({ error: 'Error placing order' });
        }
        console.log('Order placed successfully');
        return res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
    });
});

app.put('/orders', (req, res) => {
    console.log('PUT /orders endpoint reached'); // Add this logging statement

    const order = req.body;

    if (!order.cartItems || !Array.isArray(order.cartItems)) {
        return res.status(400).json({ error: 'Invalid request: cartItems is missing or not an array' });
    }

    const orderedLessons = order.cartItems.map(item => item.title);
    order.lessonsOrdered = orderedLessons;

    // Log the order details
    console.log('Received order:', order);

    // Update the available inventory for each lesson in the order
    order.cartItems.forEach(cartItem => {
        const lessonId = cartItem.id;
        const newAvailability = cartItem.availableInventory - 1; // Assuming available inventory is decremented by 1
        console.log('Updating inventory for lesson:', lessonId, 'New availability:', newAvailability); // Add this logging statement
        db.collection('lessons').updateOne(
            { _id: ObjectId(lessonId) },
            { $set: { availableInventory: newAvailability } },
            (err, result) => {
                if (err) {
                    console.error('Error updating available inventory for lesson:', lessonId, err);
                    // Handle error (e.g., rollback transaction)
                }
                console.log('Available inventory updated successfully for lesson:', lessonId); // Add this logging statement
                // Handle success (e.g., send response to client)
            }
        );
    });

    console.log('Order placed successfully');
    return res.status(200).json({ message: 'Order placed successfully' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
