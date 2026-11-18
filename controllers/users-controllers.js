const { validationResult } = require('express-validator');
const { bcrypt } = require('bcryptjs');
const { jwt } = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
  let users;

  try {
    users = await User.find({}, '-password');
  } catch (err) {
    const error = new HttpError('Fetching users failed, try again later.', 500);
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError('Invalid inputs passed, please check your data', 422),
    );
  }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Signup failed, please try again later', 500);
    console.error(err);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError('Email already exists, login instead', 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError('Could not create user, please try again', 500));
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again', 500);
    console.error(err);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      'classified_info',
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again', 500);
    console.error(err);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError('Signup failed, please try again later', 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError('Invalid credentials, could not login', 401);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Could not log you in. Please check your credentials and try again',
      500,
    );
    return next(error);
  }

  if (!isValidPassword) {
    return next(
      new HttpError(
        'Could not log you in. Please check your credentials and try again',
        500,
      ),
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      'classified_info',
      { expiresIn: '1h' },
    );
  } catch (err) {
    const error = new HttpError('Logging in up failed, please try again', 500);
    console.error(err);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
