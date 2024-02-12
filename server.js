const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
const path = require('path');

// var apiRouter = require("./routes/api_router");

app.use(express.json());

// Logger middleware function
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // Pass control to the next middleware function
});

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Serve lesson images from the 'coursework2/images' directory
app.use('/coursework2/images', express.static('coursework2/images'));

// Setting the port
app.set('port', 4000);

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

app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body },
        (err, result) => {
            if (err) return next(err);
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' });
        }
    );
});


// app.get('/search', async (req, res) => {
//     const searchTerm = req.query.q;

//     if (!searchTerm) {
//         return res.status(400).json({ error: 'Please provide a search term' });
//     }

//     try {
//         const searchResults = await db.collection('lessons').find({
//             $or: [
//                 { title: { $regex: searchTerm, $options: 'i' } },
//                 { location: { $regex: searchTerm, $options: 'i' } }
//             ]
//         }).toArray();
//         res.status(200).json({ results: searchResults });
//     } catch (error) {
//         console.error('Error searching for lessons:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

app.post('/orders', (req, res) => {
    const order = req.body;

    if (!order.cartItems || !Array.isArray(order.cartItems)) {
        return res.status(400).json({ error: 'Invalid request: cartItems is missing or not an array' });
    }

    const orderedLessons = order.cartItems.map(item => item.title);
    order.lessonsOrdered = orderedLessons;

    db.collection('orders').insertOne(order, (err, result) => {
        if (err) {
            console.error('Error placing order:', err);
            return res.status(500).json({ error: 'Error placing order' });
        }
        console.log('Order placed successfully');
        return res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
    });
});

app.put('/collection/lessons/:id', (req, res, next) => {
    const updatedInventory = req.body.availableInventory;

    db.collection('lessons').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $inc: { availableInventory: -1 } },
        (err, result) => {
            if (err) {
                console.error('Error updating inventory:', err);
                res.status(500).json({ error: 'Error updating inventory' });
                return;
            }
            if (result.modifiedCount === 1) {
                console.log('Inventory updated successfully');
                res.status(200).json({ msg: 'success' });
            } else {
                console.log('Failed to update inventory');
                res.status(404).json({ error: 'Failed to update inventory' });
            }
        }
    );
});


const searchLessons = async (searchTerm) => {
    try {
        const response = await fetch(`/search?q=${searchTerm}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const results = await response.json();
        console.log(results); // Handle the search results (update UI, etc.)
    } catch (error) {
        console.error('Error searching for lessons:', error);
    }
};

app.get('/search', async (req, res) => {
    const searchTerm = req.query.q;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Please provide a search term' });
    }

    try {
        const searchResults = await db.collection('lessons').find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { location: { $regex: searchTerm, $options: 'i' } }
            ]
        }).toArray();
        res.status(200).json(searchResults); // Respond with an array of search results directly
    } catch (error) {
        console.error('Error searching for lessons:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.get('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.findOne({ _id: new ObjectId(req.params.id) }, (err, result) => {
        if (err) return next(err);
        res.send(result);
    });
});



const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});