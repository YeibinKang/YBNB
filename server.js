var HTTP_PORT = process.env.PORT || 8080;
var express = require('express');
var app = express();
var path = require('path');
const multer = require('multer');
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const clientSessions = require("client-sessions");
const bcrypt = require('bcryptjs');

function ensureLogin(req, res, next) {
  if (!req.session.admin) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.engine(".hbs", exphbs({
  extname: ".hbs", 
  helpers: {
    is: function(a, b, options){
      if (a === b) {
        return options.fn(this);
        }
      return options.inverse(this);
    },
    ifnot: function(a, options){
      if (!a) {
        return options.fn(this);
        }
      return options.inverse(this);
    }
  }
}));

app.set("view engine", ".hbs");

app.use(clientSessions({
  cookieName: "session", // this is the object name that will be added to 'req'
  secret: "week10example_web322", // this should be a long un-guessable string.
  duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
  activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
}));


app.use(bodyParser.urlencoded({
  extended: false
}));


function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}

// A simple user object, hardcoded for this example
const admin = {
  username: "admin",
  password: "Admin123$",
  email: "admin@example.com",
  fname: "administrator"
};



//Sequeslize
const Sequelize = require('sequelize');
const {
  body
} = require('express-validator');


var sequelize = new Sequelize('d97sgbh5p1rvni', 'gwmikrnzdqdwzq', 'd59d2b125865130d40889baba9cc0b2a158605e2fdc7fb6c1e1600ed70db51cd', {
  host: 'ec2-54-85-13-135.compute-1.amazonaws.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false
    }
  }
});


var userInformation = sequelize.define('userInformation', {
  email: {
    type: Sequelize.STRING,
    unique: true
  },
  lname: Sequelize.STRING,
  fname: Sequelize.STRING,
  password: Sequelize.STRING,
  birthday: Sequelize.DATE
});



//room information database
var roomInformation = sequelize.define('roomInformation', {
  title: Sequelize.STRING,
  price: Sequelize.INTEGER,
  description: Sequelize.STRING,
  location: Sequelize.STRING,
  photo: Sequelize.STRING,
  change_title: Sequelize.STRING
})


//photo sotrage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/photo');
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
  }
});


const fileFilter = (req, file, cb) => {
  console.log("file mimetype:" + file.mimetype)
  if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

app.use(express.static("./public/"));




// Setup a route on the 'root' of the url to redirect to /login
app.get("/", (req, res) => {
  return res.render("home",{
    layout: false
  });
});

// Display the login html page
app.get("/login", function (req, res) {
  res.render("login", {
    layout: false
  });
});

// The login route that adds the user to the session
app.post("/login", (req, res) => {

  const username = req.body.username;
  const password = req.body.password;

  //hash
  userInformation.findAll({
    attributes: ['email', 'password', 'fname'],
    where: {
      email: username
    }
  }).then(function(rows){
    if (rows.length == 0) {
      res.render("home", {
        errorMsg: "invalid username or password!",
        layout: false
      });
    } else {
      bcrypt.compare(password, rows[0].password).then((ok) => {
        if (ok) {
          if (rows[0].email == admin.email) {
            req.session.admin = {
              username: admin.username,
              email: admin.email,
              fname: admin.fname,
              isAdmin: true
            };
            res.render('dashboard_admin',{
              data: JSON.parse(JSON.stringify(admin)), 
              layout: false
            });
          } else {
            res.render("dashboard", {
              data: JSON.parse(JSON.stringify(rows)),
              layout: false
            });
          }

        } else {
          res.render("home",{
            errorMsg: "invalid username or password!",
            layout: false
          });

        }
      });
    }
  });

});


// Log a user out by destroying their session
// and redirecting them to /login
app.get("/logout", function (req, res) {
  req.session.reset();
  res.redirect("/login");
});


app.get("/dashboard_admin", ensureLogin, (req, res) => {
  res.render("dashboard_admin", {
    admin: req.session.admin,
    layout: false
  });
});



//main home page
app.get("/", (req, res) => {
  return res.render("home",{
    layout: false
  });

});

//show room listing
app.get("/room_listing", (req, res) => {
  console.log("session.admin: " + JSON.stringify(req.session.admin));
  roomInformation.findAll({
    attributes: ['id', 'title', 'price', 'description', 'location', 'photo']
  }).then(function (data) {

    data = JSON.parse(JSON.stringify(data));

    return res.render("room_listing", {
      data: data,
      isAdmin: (req.session.admin != null),
      layout: false
    });
  }).catch((error)=>{
    console.log("Error: " + error);
  });
});


//show registeration page
app.get("/user_registration", (req, res) => {
  res.render("user_registration", {
    layout: false
  });

});

//show dashboard
app.get("/dashboard", (req, res) => {
  var data = {
    name: req.body.name
  };
  res.render('dashboard', {
    data: data
  });
});

//show error message
app.get("/error_unmatched", (req, res) => {

  res.sendFile(path.join(__dirname, '/views/error_unmatched.html'));
})

//show error message
app.get("/error_empty", (req, res) => {
  res.sendFile(path.join(__dirname, '/views/error_empty.html'));
})

//called it, register the user
app.post("/register", (req, res) => {

  if (req.body.fname == "" || req.body.lname == "" || req.body.email == "" || req.body.password == "" || req.body.birthday == "") {
      return res.render("user_registration",{
        layout:false,
        errorMessage:"You should fill the form!"
      })
  }

  var upperCaseFound = false;
  var specialFound = false;

  var specialCharPattern = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

  var password = req.body.password;
  

  var exist = false;

  //password
  for (var c of password) {
      if (c.toUpperCase() == c) {
          upperCaseFound = true;
      }
      if (c.match(specialCharPattern)) {
          specialFound = true;
      }
  }

  if (upperCaseFound && specialFound) {
    
      userInformation.findAll({
        attributes: ['email'],
        where: {
          email: req.body.email
        }
      }).then(function (data) {
        bcrypt.hash(password, 10)
          .then(hash => {
            return userInformation.create({
              lname: req.body.lname,
              fname: req.body.fname,
              email: req.body.email,
              password: hash,
              birthday: req.body.birthday
            })
          }).then(function (data) {
            console.log("Successfully!");
            res.render('dashboard', {
              layout: false,
              data: JSON.parse(JSON.stringify(data))
            });
          }).catch((error) => {
            res.render("user_registration", {
              errorMessage: "Already exist email",
              layout: false
            });
          });
      });
    }else{
      res.render('user_registration',{
        layout: false,
        errorMessage:"Password must have at least one upper case and one special case!"
      })
    }

});


app.get("/logout", (req, res) => {
  res.session.reset();
  res.redirect("/login");
});

app.get("/admin_create_room", (req, res) => {
 
  res.render("admin_create_room", {
    layout: false,
    errorMsg: "Missing credentials."
  });

});


//edit room information (admin)
app.get("/edit_room/:id", (req, res) => {

  roomInformation.findAll({
    attributes: ['id','title', 'price', 'description', 'location', 'photo'],
    where:{id: req.params.id}
    // where:{title: req.body.change_title}

  }).then(function (data) {
    return res.render("edit_room", {
      data: JSON.parse(JSON.stringify(data[0])),
      layout: false
    });
  });


});




app.post("/edit_room/:id", upload.single("photo"), (req, res) => {

  console.log("Edit room id is " + req.params.id )
  roomInformation.findAll({
    attributes: ['title', 'price', 'description', 'location', 'photo'],
    where: {
      id: req.params.id
    }
  }).then(function (rows) {

    var updateInfo = {};
    if (req.body.title != null) {
      updateInfo.title = req.body.title;
    }
    if (req.body.price != null) {
      updateInfo.price = req.body.price;
    }
    if (req.body.description != null) {
      updateInfo.description = req.body.description;
    }
    if (req.body.location != null) {
      updateInfo.location = req.body.location;
    }
    if (req.file != null) {
      updateInfo.photo = req.file.path.replace(/\\/g, "/").replace(/^public/, "");
    }
   
    roomInformation.update(updateInfo, {
      where: {
        id: 1
      }
    }).then(()=>{
      res.redirect("/room_listing");
    }).catch((error) => {
      res.render("edit_room",{
        data:rows[0],
        layout: false,
        errorMsg: "Error: " + error
      });
      console.log("Error: " + error);
    });
  });
});

app.post("/admin_create_room", upload.single("photo"), (req, res, next) => {

  console.log(typeof req.file.path.replaceAll)
  let imagePath = req.file.path.replace(/\\/g, "/").replace(/^public/, "")
  sequelize.sync().then(function () {
    roomInformation.create({
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        location: req.body.location,
        photo: imagePath,
        chaged_title: req.body.chaged_title
      })
      .then(() => {
        console.log("Successfully!");

        var roomInfo = {
          title: req.body.title,
          price: req.body.price,
          description: req.body.description,
          location: req.body.location,
          photo: imagePath,
          change_title: req.body.change_title
        };

        if (roomInfo.title === "" || roomInfo.price === "" || roomInfo.description === "" || roomInfo.location === "" || roomInfo.photo === "") {
          return res.render("admin_create_room", {
            errorMsg: "Missing credentials.",
            layout: false
          });
        } else {
          return res.render("room_listing", {
            data: JSON.parse(JSON.stringify(roomInfo)),
            layout: false
          });
        }

      }).catch((error) => {
        console.log("Error: " + error);
      });
  });
});


app.get("/search_by_location",(req,res)=>{
  console.log(req.query.select_picker);
  roomInformation.findAll({
    attributes: ['title', 'price', 'description', 'location', 'photo'],
    where: {location: req.query.select_picker}
  }).then(function (data) {
    console.log(data);
    return res.render("room_listing",{
      data: JSON.parse(JSON.stringify(data)),
      layout: false
    });
  }).catch((error) => {
    console.log("Error: " + error);
  })

})


//get the room_description page
app.get("/room_description/:id",(req,res) => {


  roomInformation.findAll({
    attributes: ['title', 'price', 'description', 'location', 'photo','id'], 
   where:{id:req.params.id} 
  }).then(function(rooms){

    var room = rooms[0];

    return res.render("room_description",{
      data: JSON.parse(JSON.stringify(room)),
      layout: false
    });
  }).catch((error) => {
    console.log("Error: " + error);
  });

});


app.get("/booking_date",(req,res)=>{


 roomInformation.findAll({
   attributes:['title', 'price', 'description', 'location', 'photo','id'],
   where:{id:req.query.room_id}
 }).then(function(rooms){

   var room = rooms[0];

    var check_in = new Date(req.query.check_in);
    var check_out = new Date(req.query.check_out);

    var diff = check_out - check_in;

    var days = Math.ceil(diff/(1000*3600*24));

    var price = room.price;

    
    var total_price = days*price;

    return res.render("room_description", {
      data: JSON.parse(JSON.stringify(room)),
      total_price: total_price, 
      layout:false,
      check_in: check_in,
      check_out: check_out
    })

 });
 

 app.post("/booking_date",(req,res)=>{
   res.redirect("/");
 });

})

 
sequelize.sync().then(() => {
  userInformation.findAll({
    attributes: ['email'],
    where:{email: admin.email}
  }).then((rows)=>{
    if(rows.length == 0){
      bcrypt.hash(admin.password, 10).then((hash) => {
        userInformation.create({
          email: admin.email,
          username: admin.username,
          password: hash
        });
      });
    }
  }).then(()=> {
    app.listen(HTTP_PORT);
  });
});

