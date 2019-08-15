var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var app = express();
var mongoose = require('mongoose');
var userModel = require('./models/user');

const KEY = 'Happy holi same to you.';
// var dburi = 'mongodb://127.0.0.1:27017/bloodBank';
var dburi =
	'mongodb://rishav394:Pp%409845097056@ds263127.mlab.com:63127/bloodbank';

mongoose.connect(dburi, { useNewUrlParser: true }, (err) => {
	if (err) console.log(err);
	else console.log('Connected to mongoDb');
});

app.use(express.static('public'));
app.use(cookieParser(KEY));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	}),
);

app.get('/', (req, res) => {
	res.sendFile('index.html');
});

app.get('/register', (req, res) => {
	res.sendFile(path.join(__dirname, 'public/register.html'));
});

app.post('/register', (req, res) => {
	userModel
		.findOne({ name: req.body.name })
		.then((user) => {
			if (user == null) {
				new userModel({
					name: req.body.name.toUpperCase(),
					bloodGroup: req.body.blood.toUpperCase(),
					city: req.body.city.toUpperCase(),
					phone: req.body.phone,
					amount: req.body.amount || 0,
				})
					.save()
					.then((user) => {
						res.cookie('user', user.name, {
							signed: dburi,
							maxAge: 7 * 24 * 3400,
						});
						res.redirect('/donate');
					})
					.catch((err) => {
						res.send(
							err.message + '\nPlease go Back and try again.',
						);
					});
			} else {
				res.cookie('user', user.name, {
					signed: dburi,
					maxAge: 864000,
				});
				res.redirect('/donate');
			}
		})
		.catch((err) => {
			res.send(err.message);
		});
});

app.post('/donate', (req, res) => {
	if (req.body.amount == undefined || req.body.amount <= 0) {
		res.redirect('back');
		return;
	}
	userModel.findOne({ name: req.signedCookies.user }, function(err, doc) {
		if (err) res.send(err);
		doc.amount += parseFloat(req.body.amount);
		doc.save({
			validateBeforeSave: true,
		})
			.then(res.redirect('/donate'))
			.catch((err) => {
				res.send(err.message);
			});
	});
});

app.get('/donate', (req, res) => {
	if (req.signedCookies.user) {
		// Greet user and Ask how much to donate
		userModel
			.findOne({ name: req.signedCookies.user })
			.then((user) => {
				if (user == null) {
					// Should not happen
					console.log('WTF man');
					res.redirect('/logout');
				} else {
					res.render('donate', {
						user: {
							name: user.name,
							amount: user.amount,
						},
					});
				}
			})
			.catch((err) => {
				console.log(err);
				res.send(err.message);
			});
	} else {
		res.redirect('/register');
	}
});

app.get('/bank', (req, res) => {
	if (req.query.blood == undefined) req.query.blood = '';
	if (req.query.city == undefined) req.query.city = '';
	if (req.query.zeros == undefined) req.query.zeros = 0;
	else req.query.zeros = -1;

	var query = {
		$and: [
			{ bloodGroup: { $regex: req.query.blood, $options: 'i' } },
			{ city: { $regex: req.query.city, $options: 'i' } },
			{ amount: { $ne: req.query.zeros } },
		],
	};
	userModel.find(query, function(err, docs) {
		if (err) res.send(err);
		res.render('bank', { docs: docs, logged: req.signedCookies.user });
	});
});

app.get('/logout', (req, res) => {
	res.clearCookie('user');
	res.redirect('/');
});

var port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log('App listening on port ' + port + '!');
});