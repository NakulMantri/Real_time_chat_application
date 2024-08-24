const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Group = require("../models/groupModel");
const Member = require("../models/memberModel");
const bcrypt = require("bcrypt");

const mongoose = require("mongoose");

const registerLoad = async (req, res) => {
  try {
    res.render("register");
  } catch (error) {
    console.log(error.message);
  }
};

const register = async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      image: "images/" + req.file.filename,
      phone: req.body.phone,
      password: passwordHash,
    });

    await user.save();

    res.render("register", { message: "Registration successful" });
  } catch (error) {
    console.log(error.message);
  }
};

const loadLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
};

const login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        req.session.user = userData;
        res.cookie("user", JSON.stringify(userData));
        res.redirect("/dashboard");
      } else {
        res.render("login", { message: "Email or Password is Incorrect" });
      }
    } else {
      res.render("login", { message: "Email or Password is Incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("user");
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};
const loadDashboard = async (req, res) => {
  try {
    var users = await User.find({ _id: { $nin: [req.session.user._id] } });
    res.render("dashboard", { user: req.session.user, users: users });
  } catch (error) {
    console.log(error.message);
  }
};

const saveChat = async (req, res) => {
  try {
    var chat = new Chat({
      sender_id: req.body.sender_id,
      receiver_id: req.body.receiver_id,
      message: req.body.message,
    });

    var newChat = await chat.save();
    res
      .status(200)
      .send({ success: true, msg: "Chat Inserted!", data: newChat });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    await Chat.deleteOne({ _id: req.body.id });
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const updateChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: {
          message: req.body.message,
        },
      }
    );

    res.status(200).send({ success: true });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const loadGroups = async (req, res) => {
  try {
    const groups = await Group.find({ creator_id: req.session.user._id });

    res.render("group", { groups: groups });
  } catch (error) {
    console.log(error.message);
  }
};

const createGroup = async (req, res) => {
  try {
    const group = new Group({
      creator_id: req.session.user._id,
      name: req.body.name,
      image: "images/" + req.file.filename,
      limit: req.body.limit,
    });

    await group.save();
    const groups = await Group.find({ creator_id: req.session.user._id });

    res.render("group", {
      message: req.body.name + " Group created successfully!",
      groups: groups,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const getMembers = async (req, res) => {
  try {
    var users = await User.aggregate([
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "user_id",
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        "$group_id",
                        new mongoose.Types.ObjectId(req.body.group_id),
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "member", //array checking for users//
        },
      },

      {
        $match: {
          _id: { $nin: [new mongoose.Types.ObjectId(req.session.user._id)] },
        },
      },
    ]);

    res.status(200).send({ success: true, data: users });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

const addMembers = async (req, res) => {
  try {
    if (!req.body.members) {
      return res
        .status(200)
        .send({ success: false, msg: "Please select atleast 1 member" });
    } else if (req.body.members.length > parseInt(req.body.limit)) {
      return res
        .status(200)
        .send({
          success: false,
          msg:
            "You can't select more than " +
            req.body.limit +
            " members.You've reached the limit",
        });
    } else {
      await Member.deleteMany({ group_id: req.body.group_id });
      var data = [];
      const members = req.body.members;
      for (let i = 0; i < members.length; i++) {
        data.push({
          group_id: req.body.group_id,
          user_id: members[i],
        });
      }
      await Member.insertMany(data);
      res
        .status(200)
        .send({ success: true, msg: "Members added successfully" });
    }
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const updateChatGroup = async (req, res) => {
  try {
    if (parseInt(req.body.limit) < parseInt(req.body.last_limit)) {
      await Member.deleteMany({ group_id: req.body.id });
    }
    var updateObj;

    if (req.file != undefined) {
      updateObj = {
        name: req.body.name,
        image: "images/" + req.file.filename,
        limit: req.body.limit,
      };
    } else {
      updateObj = {
        name: req.body.name,
        limit: req.body.limit,
      };
    }

    await Group.findByIdAndUpdate(
      { _id: req.body.id },
      {
        $set: updateObj
      });

    res.status(200).send({ success: true, msg: "Chat Group updated successfully" });
  } catch (error) {
    return res.status(400).send({ success: false, msg: error.message });
  }
};

const deleteChatGroup = async(req,res)=>{
    try {
await Group.deleteOne({
    _id:req.body.id});


await Member.deleteMany({
group_id:req.body.id
})

        res.status(200).send({ success: true, msg: "Chat Group deleted successfully" });


    }catch(error)
    {
        res.status(400).send({success:false,msg:error.message});
    }
}


const shareGroup = async (req, res) => {
  try {
    const groupData = await Group.findOne({ _id: req.params.id });

    if (!groupData) {
      res.render('error', { message: '404 not found!' });
      return;
    } 

    if (req.session.user === undefined) {
      res.render('error', { message: 'You need to login first, to access the shared url!' });
      return;
    }

    const totalMembers = await Member.find({ group_id: req.params.id }).count();
    const availble = groupData.limit - totalMembers;
    const isOwner = groupData.creator_id.toString() === req.session.user._id.toString();
    const isJoined = await Member.find({ group_id: req.params.id, user_id: req.session.user._id }).count() > 0;

    console.log(`Total Members: ${totalMembers}, Available: ${availble}, Is Owner: ${isOwner}, Is Joined: ${isJoined}`);

    res.render('shareLink', {
      group: groupData,
      availble: availble,
      totalMembers: totalMembers,
      isOwner: isOwner,
      isJoined: isJoined
    });

  } catch (error) {
    console.log(error.message);
    res.render('error', { message: 'An error occurred while processing your request.' });
  }
};

const joinGroup = async(req,res)=>{
try{

const Member = new Member({
  group_id:req.body.group_id,
  user_id:req.session.user._id
})
await Member.save();
  res.send({success:true,msg:'Congratulations, you have joined the group'})


}catch(error){
  res.send({success:false,msg:error.message})
}
}




module.exports = {
  registerLoad,
  register,
  loadLogin,
  login,
  logout,
  loadDashboard,
  saveChat,
  deleteChat,
  updateChat,
  loadGroups,
  createGroup,
  getMembers,
  addMembers,
  updateChatGroup,
  deleteChatGroup,
  shareGroup,
  joinGroup
};
