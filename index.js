const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jiixnyw.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const appointmentOptionCollection = client.db("doctorsPortal").collection("appointmentOptions");

    const bookingsCollection = client.db("doctorsPortal").collection("bookings");

    const usersCollection = client.db("doctorsPortal").collection("users");

    // Use Aggregate to query multiple collection and then merge data
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();

      // get the bookings of the provided date
      const bookingQuery = {appointmentDate: date};
      const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

      // code carefully
      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
        const bookedSlots = optionBooked.map(book => book.slot);
        const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
        option.slots = remainingSlots;
        console.log(date, option.name, remainingSlots.length);
      });

      res.send(options);
    });

    /*
    Advanced(Module: 74.7)
    ------------------------
    app.get('/v2/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const options = await appointmentOptionCollection.aggregate([
                {
                    $lookup: {
                        from: 'bookings',
                        localField: 'name',
                        foreignField: 'treatment',
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$appointmentDate', date]
                                    }
                                }
                            }
                        ],
                        as: 'booked'
                    }
                },
                {
                    $project: {
                        name: 1,
                        slots: 1,
                        booked: {
                            $map: {
                                input: '$booked',
                                as: 'book',
                                in: '$$book.slot'
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        slots: {
                            $setDifference: ['$slots', '$booked']
                        }
                    }
                }
            ]).toArray();
            res.send(options);
        })

    */

    /**
     * API naming convention:
     * ----------------------
     * bookings = jei nam er api niye amra kaj korbo
     * app.get('/bookings') = sob booking gulo k pete chai
     * app.get('/bookings/:id') = bookings theke specific id ta ke pete chai
     * app.post('/bookings') = mane holo bookings er moddhe notun ekta object/data add korte chai
     * app.patch('/bookings/:id') = kono specific id wala data k update korte chai
     * app.delete('/delete/:id') = jekono specific id wala data k delete korte chai
     */


    app.get('/bookings', async(req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = {email: email};
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    })

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatement: booking.treatement
      }

      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if(alreadyBooked.length){
        const message = `You already have a booking on ${booking.appointmentDate}`
        return res.send({acknowledged: false, message})
      }

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });


    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Doctors Portal Server is Running");
});

app.listen(port, () => console.log(`Doctors portal running on port ${port}`));
