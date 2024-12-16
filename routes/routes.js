const express = require('express');
const router = express.Router();
const User = require('../models/users');
const multer = require('multer');
const fs = require('fs');

//upload image 

var storage = multer.diskStorage({
    destination: function(req,file,cb ){
        cb(null,'./uploads');
    },
    filename: function(req,file,cb){
        cb(null,file.fieldname+"_"+Date.now()+"_"+file.originalname);
    }

});

var upload = multer({
    storage: storage,
}).single('image');

// Insert a user into database route
router.post('/add', upload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded', type: 'danger' });
    }

    const user = new User({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        image: req.file.filename
    });

    user.save()
        .then(() => {
            req.session.message = {
                type: 'success',
                message: 'User added successfully!'
            };
            res.redirect('/');
        })
        .catch(err => {
            res.status(500).json({ message: err.message, type: 'danger' });
        });
});

//Get all users route
router.get('/', async (req, res) => {
    try {
        const users = await User.find(); // Fetch users
        
        // Get the message from the session, if it exists
        const message = req.session.message || null;
        req.session.message = null; // Clear the message after displaying it

        res.render('index', { 
            title: 'Home Page',
            users: users,
            message: message // Pass the message to the view
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/',(req,res)=>{
    res.render('index',{title: 'Home Page'});
});

router.get('/add',(req,res)=>{
    res.render('add_users', {title: 'Add Users'})
})

// Edit a user route

router.get('/edit/:id', async (req, res) => {
    try {
        const userId = req.params.id.trim(); // Get the user ID from the route parameters
        const user = await User.findById(userId); // Find the user by ID

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.render('edit_users', { // Assuming you want to render a user view
            title: 'User Details',
            user: user,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// update user route
router.post('/update/:id', upload, async (req, res) => {
    const id = req.params.id;
    let new_image = '';

    try {
        // Check if a new file is uploaded
        if (req.file) {
            new_image = req.file.filename;

            // Remove the old image file from the server
            fs.unlinkSync('./upload/' + req.body.old_image);
        } else {
            new_image = req.body.old_image; // Keep the old image
        }

        // Update the user in the database
        const updatedUser = await User.findByIdAndUpdate(id, {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            image: new_image,
        }, { new: true }); // Return the updated document

        // Check if the user was found and updated
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found', type: 'danger' });
        }

        // Set success message in session
        req.session.message = {
            type: 'success',
            message: 'User updated successfully',
        };

        res.redirect('/'); // Redirect to the home page
    } catch (err) {
        // Handle any errors
        console.error(err); // Log the error for debugging
        req.session.message = {
            type: 'danger',
            message: err.message,
        };
        
        res.redirect('/'); // Redirect on error
    }
});


//delete user route



router.get('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // Find the user by ID and delete it
        const user = await User.findByIdAndDelete(id); // Use findByIdAndDelete

        // Check if the user was found and has an image
        if (user && user.image) {
            try {
                // Remove the user's image from the server
                fs.unlinkSync('./uploads/' + user.image);
            } catch (err) {
                console.log('Error deleting image:', err);
            }
        }

        // Set success message in session
        req.session.message = {
            type: 'success',
            message: 'User deleted successfully',
        };

        res.redirect('/'); // Redirect to the home page
    } catch (err) {
        // Handle any errors
        console.error('Error deleting user:', err);
        req.session.message = {
            type: 'danger',
            message: err.message,
        };

        res.redirect('/'); // Redirect on error
    }
});

module.exports = router;