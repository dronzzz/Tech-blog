require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const app = express();
const _ = require("lodash");
const Schema = mongoose.Schema;
const LocalStrategy = require('passport-local').Strategy;
// const encrypt = require('mongoose-encryption');   level 2
// const md5 = require('md5');    ///level 4

// const bcrypt = require('bcrypt');
// const saltRounds = 11;

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));



app.use(session({
  secret: "yoursecretkey",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));


app.use(passport.initialize());
app.use(passport.session());


const dbString = process.env.monog_url;
console.log(dbString);

mongoose.connect(dbString).then(()=> console.log('connected to atlas')) .catch(err=>{
  console.log(err);
})

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
passport.use(new LocalStrategy(User.authenticate()));
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());





//////////////////////////////////////////////////////////current status working before adding blog data
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String

  },
  category: {
    type: String,
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
  // writtenBlog: {userSchema}
})


const Blog = mongoose.model("Blog", blogSchema);



app.get("/compose", function (req, res) {
  res.render("compose");
})
app.post("/compose", ensureAuthenticated, function (req, res) {

  const title = req.body.title;
  // if (req.isAuthenticated()) {

  User.findOne({ username: req.user.username }, function (err, user) {
    console.log("inside user");
    if (err) {
      console.log(err);
      return;
    }
    if (!user) {
      console.log("User not found");
    }



    Blog.findOne({ title: title }, function (err, foundBlog) {
      if (err) {
        console.log(err);
        return;
      }
      if (foundBlog) {
        console.log("The blog already exists");

      } else {
        const newBlog = new Blog({
          title: title,
          content: req.body.content,
          imageUrl: req.body.ImageUrl,
          category: req.body.category,
          author: req.user._id
        })

        newBlog.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("successfully saved");
            // res.redirect();

          }

        })
      }

    })

  })

  // }

})




function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

///////////////////////
app.get("/posts/:topic", function (req, res) {






  // if (req.isAuthenticated()) {
  let urlTitle = req.params.topic;
  let requiredTitle = _.lowerCase(urlTitle);
  console.log(requiredTitle);

  
  Blog.find({}, function (err, blogs) {
    if (err) {
      console.error(err);
    } else {
      blogs.forEach(blog => {
        titleOfContent = blog.title;
        storedTitle = _.lowerCase(titleOfContent);

        if (storedTitle === requiredTitle) {
          console.log("match found !");

          Blog.findOne({ title: titleOfContent }, function (err, specific_blog) {
            if (err) {
              console.error(err);
            } else {



              ////ebd
              res.render("newpost", { data: specific_blog,allData :blog });  /////titleOfContent: titleOfContent,
            }

          })

        } else {
          console.log("Wrong Url");
        }

      })
    }
  })



});
/////////////////////



app.get("/",async function (req, res) {

 try{

   Blog.aggregate([
     {
       $match: {
         category: { $in: ['Tech', 'Innovation', 'Finance', 'StartUps'] }
      }
    }, {
      $group: {
        _id: "$category",
        item: { $push: "$$ROOT" }
      }
    }],
    function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
        
        
        

        //new attemp;t
        // var heading= ['Tech','Innovation','Finance','StartUps'];
        var boxColor = ["rgba(82,0,255,.9)", "rgba(60,255,208,.9)", "rgba(255,194,231,.9)", "#00FFAB"]
        var allFirstNames = [];
        var allLastNames = []; // accumulate all the first names in this array
        (async () => {
          for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].item.length; j++) {
              try {
                const blog = await Blog.find({ title: data[i].item[j].title }).populate('author');
                var firstNames = [];
                var lastNames = [];

                for (var k = 0; k < blog.length; k++) {
                  if (blog[k].author) {
                    firstNames.push(blog[k].author.firstName);
                    lastNames.push(blog[k].author.lastName);
                  }
                }
                allFirstNames = allFirstNames.concat(firstNames);
                allLastNames = allLastNames.concat(lastNames); // add the first names to the main array
              } catch (err) {
                console.error(err);
              }
            }
          }
          // only render the template when all the data has been collected
          // console.log(allFirstNames);
          res.render("home", { data: data, fname: allFirstNames, lname: allLastNames, boxColor: boxColor });
        })();

 }
})













 } catch (err){
  console.log(err);
 }


})
app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {

    Blog.aggregate([
      {
        $match: {
          category: { $in: ['Tech', 'Innovation', 'Finance', 'StartUps'] }
        }
      }, {
        $group: {
          _id: "$category",
          item: { $push: "$$ROOT" }
        }
      }],
      function (err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log(data);

          var boxColor = ["rgba(82,0,255,.9)", "rgba(60,255,208,.9)", "rgba(255,194,231,.9)", "#00FFAB"]
          var allFirstNames = [];
          var allLastNames = []; // accumulate all the first names in this array
          (async () => {
            for (var i = 0; i < data.length; i++) {
              for (var j = 0; j < data[i].item.length; j++) {
                try {
                  const blog = await Blog.find({ title: data[i].item[j].title }).populate('author');
                  var firstNames = [];
                  var lastNames = [];

                  for (var k = 0; k < blog.length; k++) {
                    if (blog[k].author) {
                      firstNames.push(blog[k].author.firstName);
                      lastNames.push(blog[k].author.lastName);
                    }
                  }
                  allFirstNames = allFirstNames.concat(firstNames);
                  allLastNames = allLastNames.concat(lastNames); // add the first names to the main array
                } catch (err) {
                  console.error(err);
                }
              }
            }
            // only render the template when all the data has been collected
            // console.log(allFirstNames);
            res.render("signedIn", { user: req.user, data: data, fname: allFirstNames, lname: allLastNames, boxColor: boxColor });
          })();




        }

      }
    )





  } else {
    res.redirect("/login");

  }
})


app.get("/published", function (req, res) {

  if (req.isAuthenticated()) {
    // console.log("parameter passed");

    Blog.find({ author: req.user._id })
      .populate("author")
      .then(blogs => {
        res.render("published", { info: blogs, user: req.user });
      })
      .catch(err => console.error(err));

  }
  else {
    res.redirect("/login");

  }
})

app.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});



app.post('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.get("/register", function (req, res) {
  res.render("register")

})
app.post("/register", function (req, res) {

  const user = new User({ firstName: req.body.firstName, lastName: req.body.lastName, username: req.body.username });
  User.register(user, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.render("register");

    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets")
      })
    }
  })
});




app.get("/login", function (req, res) {
  res.render("login");


})
app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      User.authenticate("local")(req, res, function () {
        res.redirect("/secrets")
      })
    }
  })

})









app.listen(3000, function () {
  console.log("server is started at port 3000");
})





//
// const passport = require("passport");
// const LocalStrategy = require("passport-local-mongoose");
//
// const userSchema = new mongoose.Schema({
//     firstName: {
//         type: String,
//         required: true
//     },
//     lastName: {
//         type: String,
//         required: true
//     },
//     email: {
//         type: String,
//         required: true
//     },
