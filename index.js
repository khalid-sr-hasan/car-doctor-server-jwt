require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const cors = require("cors");
const prot = process.env.PORT || 5000;

// middleware
app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
    })
    //     {
    //     origin: ["http://localhost:5173", "http://localhost:5176"],
    //     credentials: true,
    // }
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xoels.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

// own middleware
const logger = async (req, res, next) => {
    // console.log("called:", req.host, req.originalUrl);

    next();
};

// const verifyToken = async (req, res, next) => {
//     const token = req.cookies?.token;

//     if (!token) {
//         return res.status(401).send({ message: "not authorize access" });
//     }

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             return res.status(401).send({ message: "unAuthorize" });
//         }
//         // console.log("token value", decoded);
//         req.decoded = decoded;
//         next();
//     });
// };

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: "unAuthorize access" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "not Authorize access" });
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("carDoctor");
        const servicesCollection = database.collection("services");
        const bookingsCollection = client
            .db("carDoctor")
            .collection("bookings");

        // auth related api
        // app.post("/jwt", (req, res) => {
        //     const user = req.body;

        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: "1h",
        //     });

        //     res.cookie("token", token, {
        //         httpOnly: true,
        //         secure: false,
        //     });
        //     res.send({ success: true });
        // });

        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "10s",
            });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            }).send({ success: true });
        });

        app.post("/logout", (req, res) => {
            res.clearCookie("token", { maxAge: 0 }).send({ message: true });
        });

        // get all data from database
        app.get("/services", async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        // ger single services data from database
        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            // const options = {
            //     // Include only the `title` and `imdb` fields in the returned document
            //     projection: { title: 1, price: 1, facility: 1 },
            // };
            const result = await servicesCollection.findOne(query);
            res.send(result);
        });

        // create post method
        app.post("/bookings", async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get("/bookings", logger, verifyToken, async (req, res) => {
            // console.log("token value from decode", req.decoded);

            // if (req.query.userEmail !== req.decoded.email) {
            //     console.log("Forbidden error: email mismatch");
            //     return res.status(403).send({ message: "forbidden" });
            // }

            if (req.query.userEmail !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden" });
            }

            let query = {};
            if (req.query?.userEmail) {
                query = { userEmail: req.query.userEmail };
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        // delete user data
        app.delete("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        // update confirmed
        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateBooking = req.body;
            console.log(updateBooking.status);
            const updateBookingDoc = {
                $set: {
                    status: updateBooking.status,
                },
            };
            const result = await bookingsCollection.updateOne(
                filter,
                updateBookingDoc
            );
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("car doctor server is running");
});

app.listen(prot, () => {
    console.log(`server is running POST: ${prot}`);
});
