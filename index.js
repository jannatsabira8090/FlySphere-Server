const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ojv3wo1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const flightCollection = client.db("GoZayaan").collection("flights");
    const userCollection = client.db("GoZayaan").collection("users");
    const paymentCollection = client.db("GoZayaan").collection("payment");
    const newsletterCollection = client.db("GoZayaan").collection("newsletter");

    // Admin Checked Form

    app.get("/adminKi", async (req, res) => {
      const email = req?.query?.email;
      const filter = { Email: email };
      const result = await userCollection.findOne(filter);
      if (result?.userRole === "Admin") {
        return res.send({ message: true });
      }
      res.send({ message: false });
    });

    //Booked user check

    app.get("/bookKorse", async (req, res) => {
      const email = req?.query?.email;
      const filter = { userEmail: email };
      const result = await paymentCollection.findOne(filter);
      console.log(result);
      if (result) {
        return res.send({ message: true });
      }
      res.send({ message: false });
    });

    //Show User Booked profile

    app.get("/bookedByUser", async (req, res) => {
      const email = req?.query?.email;
      const filter = { userEmail: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    });

    //Get the specific booked data information

    app.get("/specificBookedFlight/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(filter);
      res.send(result);
    });

    //Saved Signed in user

    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user?.Email;
      const filter = { Email: email };
      const findResult = await userCollection.findOne(filter);
      if (findResult) {
        return res.send({ message: "User already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send({ message: "User Successfully Added to the database!" });
    });

    //Get All Saved User

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //Add a flight

    app.post("/addFlight", async (req, res) => {
      const flight = req.body;
      const result = await flightCollection.insertOne(flight);
      res.send(result);
    });
    //Get All Flight

    app.get("/getFlight", async (req, res) => {
      const query = req.query;
      const from = query?.arr;
      const to = query?.des;
      const fast = query?.fastest;
      let filter = {};
      if (from !== "aa" && to !== "bb") {
        filter = { From: from, To: to };
      }
      const sortOptions = fast == "true" ? { Total_Time: 1 } : { Fare: 1 };
      const options = {
        sort: sortOptions,
      };
      const result = await flightCollection.find(filter, options).toArray();
      res.send(result);
    });
    // Get All Flight By View All Flight Page

    app.get("/allFlight", async (req, res) => {
      const result = await flightCollection.find().toArray();
      res.send(result);
    });
    //Get Flight By IDs

    app.get("/getFlight/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await flightCollection.findOne(filter);
      res.send(result);
    });
    //Update Flight Details

    app.patch("/updateFlight", async (req, res) => {
      const flight = req.body;
      const {
        id,
        Flight_Name,
        Airline,
        image,
        From,
        To,
        Departure_Time,
        Arrival_Time,
        Total_Time,
        Total_Stops,
        Fare,
      } = flight;
      console.log("Flight Details", flight);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          Flight_Name: Flight_Name,
          Airline: Airline,
          image: image,
          From: From,
          To: To,
          Departure_Time: Departure_Time,
          Arrival_Time: Arrival_Time,
          Total_Time: Total_Time,
          Total_Stops: Total_Stops,
          Fare: Fare,
        },
      };
      const result = await flightCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // Delete Flight

    app.delete("/deleteFlight/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await flightCollection.deleteOne(filter);
      res.send(result);
    });

    //Store payment data in database

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    //TotalEarned

    app.get("/totalEarned", async (req, res) => {
      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null, // No grouping by a specific field, just sum all documents
              totalEarned: { $sum: "$price" }, // Summing the `price` field
            },
          },
          {
            $project: {
              _id: 0, // Exclude the `_id` field from the result
              totalEarned: 1, // Include the totalPrice field
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    //Count Airline Uses

    app.get("/Airline", async (req, res) => {
      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: "$flight.Airline", // Group by the airline name
              count: { $sum: 1 }, // Count the number of bookings for each airline
            },
          },
          {
            $project: {
              _id: 0, // Exclude the `_id` field from the result
              airline: "$_id", // Rename `_id` to `airline`
              count: 1, // Include the count field
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    // Get Payment Details from database

    app.get("/payment", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    app.post("/newsletter", async (req, res) => {
      const user = req.body;
      const result = await newsletterCollection.insertOne(user);
      res.send(result);
    });

    app.get("/newsletter", async (req, res) => {
      const result = await newsletterCollection.find().toArray();
      res.send(result);
    });

    //Payment Related API

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "bdt",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    console.log("Successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("GoZayaan is Running on Server!");
});

app.listen(port, () => {
  console.log(`GoZayaan is running on the port ${port}`);
});
