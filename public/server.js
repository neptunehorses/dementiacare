const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const winston = require('winston');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 로그 설정
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// 이미지 업로드 설정
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
});

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 사용자 스키마
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    profile: {
        bio: String,
        avatar: String,
        location: String
    },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    emailNotifications: { type: Boolean, default: true },
    stats: {
        totalPosts: { type: Number, default: 0 },
        totalComments: { type: Number, default: 0 },
        totalLikes: { type: Number, default: 0 }
    },
    isAdmin: { type: Boolean, default: false },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// 게시글 스키마
const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    image: { type: String },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    likeCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 }
});

// 댓글 스키마 추가
const commentSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// 대댓글 스키마 추가
const replySchema = new mongoose.Schema({
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Reply = mongoose.model('Reply', replySchema);

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 라우트 설정
app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email
        });
        await user.save();
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ error: '회원가입에 실패했습니다.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(400).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: '비밀번호가 올바르지 않습니다.' });
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: '로그인에 실패했습니다.' });
    }
});

// 게시글 관련 API
app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
        const post = new Post({
            title: req.body.title,
            content: req.body.content,
            category: req.body.category,
            author: req.user.id
        });
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: '게시글 작성에 실패했습니다.' });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const query = category && category !== 'all' ? { category } : {};
        
        const posts = await Post.find(query)
            .populate('author', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Post.countDocuments(query);
        
        res.json({
            posts,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ error: '게시글을 불러오는데 실패했습니다.' });
    }
});

// 이미지 업로드 API
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 없습니다.' });
        }
        res.json({ imageUrl: `/uploads/${req.file.filename}` });
    } catch (error) {
        logger.error('이미지 업로드 실패:', error);
        res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
    }
});

// 댓글 API
app.post('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }

        const comment = new Comment({
            post: post._id,
            author: req.user.id,
            content: req.body.content
        });

        await comment.save();
        post.comments.push(comment._id);
        await post.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'username');

        res.status(201).json(populatedComment);
    } catch (error) {
        logger.error('댓글 작성 실패:', error);
        res.status(500).json({ error: '댓글 작성에 실패했습니다.' });
    }
});

app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.postId })
            .populate('author', 'username')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        logger.error('댓글 조회 실패:', error);
        res.status(500).json({ error: '댓글을 불러오는데 실패했습니다.' });
    }
});

// 게시글 수정/삭제 API
app.put('/api/posts/:postId', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.postId,
            {
                title: req.body.title,
                content: req.body.content,
                category: req.body.category,
                image: req.body.image
            },
            { new: true }
        ).populate('author', 'username');
        
        res.json(updatedPost);
    } catch (error) {
        logger.error('게시글 수정 실패:', error);
        res.status(500).json({ error: '게시글 수정에 실패했습니다.' });
    }
});

app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        
        await Comment.deleteMany({ post: post._id });
        await Post.findByIdAndDelete(req.params.postId);
        
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        logger.error('게시글 삭제 실패:', error);
        res.status(500).json({ error: '게시글 삭제에 실패했습니다.' });
    }
});

// 댓글 수정/삭제 API
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        
        comment.content = req.body.content;
        await comment.save();
        
        const updatedComment = await Comment.findById(comment._id)
            .populate('author', 'username');
            
        res.json(updatedComment);
    } catch (error) {
        logger.error('댓글 수정 실패:', error);
        res.status(500).json({ error: '댓글 수정에 실패했습니다.' });
    }
});

app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comment.author.toString() !== req.user.id) {
            return res.status(403).json({ error: '권한이 없습니다.' });
        }
        
        await Comment.findByIdAndDelete(req.params.commentId);
        
        // 게시글의 comments 배열에서도 제거
        await Post.findByIdAndUpdate(comment.post, {
            $pull: { comments: comment._id }
        });
        
        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        logger.error('댓글 삭제 실패:', error);
        res.status(500).json({ error: '댓글 삭제에 실패했습니다.' });
    }
});

// 검색 API
app.get('/api/search', async (req, res) => {
    try {
        const { query, category, page = 1, limit = 10 } = req.query;
        const searchQuery = {
            $and: [
                {
                    $or: [
                        { title: { $regex: query, $options: 'i' } },
                        { content: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        };
        
        if (category && category !== 'all') {
            searchQuery.$and.push({ category });
        }
        
        const posts = await Post.find(searchQuery)
            .populate('author', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Post.countDocuments(searchQuery);
        
        res.json({
            posts,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        logger.error('검색 실패:', error);
        res.status(500).json({ error: '검색에 실패했습니다.' });
    }
});

// Socket.io 설정
const server = http.createServer(app);
const io = socketIo(server);

// Socket.io 이벤트 처리
io.on('connection', (socket) => {
    console.log('사용자가 연결되었습니다.');
    
    socket.on('join', (postId) => {
        socket.join(postId);
    });
    
    socket.on('disconnect', () => {
        console.log('사용자가 연결을 종료했습니다.');
    });
});

// 알림 스키마 추가
const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String,
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// 알림 API
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('sender', 'username')
            .populate('post', 'title')
            .sort({ createdAt: -1 })
            .limit(20);
            
        res.json(notifications);
    } catch (error) {
        logger.error('알림 조회 실패:', error);
        res.status(500).json({ error: '알림을 불러오는데 실패했습니다.' });
    }
});

app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.notificationId,
            { read: true },
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        logger.error('알림 읽음 처리 실패:', error);
        res.status(500).json({ error: '알림 읽음 처리에 실패했습니다.' });
    }
});

// 대댓글 API
app.post('/api/comments/:commentId/replies', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
        }

        const reply = new Reply({
            comment: comment._id,
            author: req.user.id,
            content: req.body.content
        });

        await reply.save();

        // 알림 생성
        const notification = new Notification({
            recipient: comment.author,
            sender: req.user.id,
            type: 'reply',
            post: comment.post
        });
        await notification.save();

        const populatedReply = await Reply.findById(reply._id)
            .populate('author', 'username');

        res.status(201).json(populatedReply);
    } catch (error) {
        logger.error('대댓글 작성 실패:', error);
        res.status(500).json({ error: '대댓글 작성에 실패했습니다.' });
    }
});

// 좋아요/북마크 API
app.post('/api/posts/:postId/like', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const user = await User.findById(req.user.id);

        const hasLiked = user.likes.includes(post._id);
        if (hasLiked) {
            await User.findByIdAndUpdate(req.user.id, {
                $pull: { likes: post._id }
            });
            await Post.findByIdAndUpdate(post._id, {
                $inc: { likeCount: -1 }
            });
        } else {
            await User.findByIdAndUpdate(req.user.id, {
                $push: { likes: post._id }
            });
            await Post.findByIdAndUpdate(post._id, {
                $inc: { likeCount: 1 }
            });

            // 알림 생성
            const notification = new Notification({
                recipient: post.author,
                sender: req.user.id,
                type: 'like',
                post: post._id
            });
            await notification.save();
        }

        res.json({ liked: !hasLiked });
    } catch (error) {
        logger.error('좋아요 처리 실패:', error);
        res.status(500).json({ error: '좋아요 처리에 실패했습니다.' });
    }
});

app.post('/api/posts/:postId/bookmark', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const user = await User.findById(req.user.id);

        const hasBookmarked = user.bookmarks.includes(post._id);
        if (hasBookmarked) {
            await User.findByIdAndUpdate(req.user.id, {
                $pull: { bookmarks: post._id }
            });
            await Post.findByIdAndUpdate(post._id, {
                $inc: { bookmarkCount: -1 }
            });
        } else {
            await User.findByIdAndUpdate(req.user.id, {
                $push: { bookmarks: post._id }
            });
            await Post.findByIdAndUpdate(post._id, {
                $inc: { bookmarkCount: 1 }
            });
        }

        res.json({ bookmarked: !hasBookmarked });
    } catch (error) {
        logger.error('북마크 처리 실패:', error);
        res.status(500).json({ error: '북마크 처리에 실패했습니다.' });
    }
});

// 프로필 API
app.get('/api/users/:userId/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('username profile createdAt');
        
        const posts = await Post.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(5);
            
        res.json({ user, posts });
    } catch (error) {
        logger.error('프로필 조회 실패:', error);
        res.status(500).json({ error: '프로필 조회에 실패했습니다.' });
    }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                'profile.bio': req.body.bio,
                'profile.location': req.body.location
            },
            { new: true }
        ).select('username profile');
        
        res.json(updatedUser);
    } catch (error) {
        logger.error('프로필 수정 실패:', error);
        res.status(500).json({ error: '프로필 수정에 실패했습니다.' });
    }
});

// 프로필 이미지 업로드 API
app.post('/api/users/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '이미지를 선택해주세요.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 'profile.avatar': `/uploads/${req.file.filename}` },
            { new: true }
        );

        res.json({ avatarUrl: user.profile.avatar });
    } catch (error) {
        logger.error('프로필 이미지 업로드 실패:', error);
        res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
    }
});

// 팔로우/언팔로우 API
app.post('/api/users/:userId/follow', authenticateToken, async (req, res) => {
    try {
        if (req.user.id === req.params.userId) {
            return res.status(400).json({ error: '자기 자신을 팔로우할 수 없습니다.' });
        }

        const user = await User.findById(req.user.id);
        const targetUser = await User.findById(req.params.userId);

        const isFollowing = user.following.includes(targetUser._id);
        if (isFollowing) {
            await User.findByIdAndUpdate(req.user.id, {
                $pull: { following: targetUser._id }
            });
            await User.findByIdAndUpdate(targetUser._id, {
                $pull: { followers: user._id }
            });
        } else {
            await User.findByIdAndUpdate(req.user.id, {
                $push: { following: targetUser._id }
            });
            await User.findByIdAndUpdate(targetUser._id, {
                $push: { followers: user._id }
            });

            // 이메일 알림 전송
            if (targetUser.emailNotifications) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: targetUser.email,
                    subject: '새로운 팔로워 알림',
                    html: `
                        <h2>${user.username}님이 회원님을 팔로우하기 시작했습니다.</h2>
                        <p>프로필을 확인하려면 <a href="${process.env.SITE_URL}/profile.html?id=${user._id}">여기</a>를 클릭하세요.</p>
                    `
                };
                await transporter.sendMail(mailOptions);
            }
        }

        res.json({ following: !isFollowing });
    } catch (error) {
        logger.error('팔로우 처리 실패:', error);
        res.status(500).json({ error: '팔로우 처리에 실패했습니다.' });
    }
});

// 활동 통계 API
app.get('/api/users/:userId/stats', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('stats')
            .populate('followers', 'username profile.avatar')
            .populate('following', 'username profile.avatar');

        const recentActivity = await Promise.all([
            Post.find({ author: req.params.userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('author', 'username'),
            Comment.find({ author: req.params.userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('post', 'title')
        ]);

        res.json({
            stats: user.stats,
            followers: user.followers,
            following: user.following,
            recentPosts: recentActivity[0],
            recentComments: recentActivity[1]
        });
    } catch (error) {
        logger.error('통계 조회 실패:', error);
        res.status(500).json({ error: '통계 조회에 실패했습니다.' });
    }
});

// 이메일 설정 API
app.put('/api/users/email-settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { emailNotifications: req.body.emailNotifications },
            { new: true }
        );
        res.json({ emailNotifications: user.emailNotifications });
    } catch (error) {
        logger.error('이메일 설정 변경 실패:', error);
        res.status(500).json({ error: '이메일 설정 변경에 실패했습니다.' });
    }
});

// 신고 스키마
const reportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reported: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// 차단 스키마
const blockSchema = new mongoose.Schema({
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

// 채팅방 스키마
const chatRoomSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String },
    lastMessageTime: { type: Date },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    name: String, // 그룹채팅방 이름
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 그룹채팅방 관리자
    files: [{ 
        url: String,
        type: String,
        name: String,
        uploadedAt: { type: Date, default: Date.now }
    }]
});

// 채팅 메시지 스키마
const messageSchema = new mongoose.Schema({
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    fileUrl: String,
    fileName: String
});

const Report = mongoose.model('Report', reportSchema);
const Block = mongoose.model('Block', blockSchema);
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const Message = mongoose.model('Message', messageSchema);

// 관리자 미들웨어
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.isAdmin) {
            return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: '권한 확인에 실패했습니다.' });
    }
};

// 신고 API
app.post('/api/reports', authenticateToken, async (req, res) => {
    try {
        const report = new Report({
            reporter: req.user.id,
            reported: req.body.reported,
            post: req.body.post,
            comment: req.body.comment,
            reason: req.body.reason
        });
        await report.save();

        // 관리자에게 이메일 알림
        const admins = await User.find({ isAdmin: true });
        for (const admin of admins) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: admin.email,
                subject: '새로운 신고가 접수되었습니다',
                html: `
                    <h2>새로운 신고 내용</h2>
                    <p>신고 사유: ${req.body.reason}</p>
                    <p>관리자 페이지에서 확인하세요.</p>
                `
            };
            await transporter.sendMail(mailOptions);
        }

        res.status(201).json(report);
    } catch (error) {
        logger.error('신고 접수 실패:', error);
        res.status(500).json({ error: '신고 접수에 실패했습니다.' });
    }
});

// 차단 API
app.post('/api/users/:userId/block', authenticateToken, async (req, res) => {
    try {
        const block = new Block({
            blocker: req.user.id,
            blocked: req.params.userId
        });
        await block.save();

        await User.findByIdAndUpdate(req.user.id, {
            $push: { blockedUsers: req.params.userId }
        });

        res.json({ message: '사용자를 차단했습니다.' });
    } catch (error) {
        logger.error('사용자 차단 실패:', error);
        res.status(500).json({ error: '사용자 차단에 실패했습니다.' });
    }
});

// 채팅 API
app.post('/api/chat/rooms', authenticateToken, async (req, res) => {
    try {
        const existingRoom = await ChatRoom.findOne({
            participants: { $all: [req.user.id, req.body.userId] }
        });

        if (existingRoom) {
            return res.json(existingRoom);
        }

        const room = new ChatRoom({
            participants: [req.user.id, req.body.userId]
        });
        await room.save();

        res.status(201).json(room);
    } catch (error) {
        logger.error('채팅방 생성 실패:', error);
        res.status(500).json({ error: '채팅방 생성에 실패했습니다.' });
    }
});

// Socket.io 이벤트 추가
io.on('connection', (socket) => {
    socket.on('join chat', (roomId) => {
        socket.join(roomId);
    });

    socket.on('chat message', async (data) => {
        try {
            const message = new Message({
                room: data.roomId,
                sender: data.senderId,
                content: data.content
            });
            await message.save();

            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'username');

            io.to(data.roomId).emit('new message', populatedMessage);

            // 채팅방 정보 업데이트
            await ChatRoom.findByIdAndUpdate(data.roomId, {
                lastMessage: data.content,
                lastMessageTime: new Date()
            });
        } catch (error) {
            logger.error('메시지 전송 실패:', error);
        }
    });
});

// 관리자 API
app.get('/api/admin/reports', authenticateToken, isAdmin, async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('reporter', 'username')
            .populate('reported', 'username')
            .populate('post', 'title')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        logger.error('신고 목록 조회 실패:', error);
        res.status(500).json({ error: '신고 목록 조회에 실패했습니다.' });
    }
});

app.put('/api/admin/reports/:reportId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(
            req.params.reportId,
            { status: req.body.status },
            { new: true }
        );
        res.json(report);
    } catch (error) {
        logger.error('신고 처리 실패:', error);
        res.status(500).json({ error: '신고 처리에 실패했습니다.' });
    }
});

// 관리자 권한 레벨 스키마
const adminLevelSchema = new mongoose.Schema({
    level: { type: Number, required: true }, // 1: 일반관리자, 2: 중간관리자, 3: 최고관리자
    permissions: [{
        type: String,
        enum: ['user_manage', 'post_manage', 'report_manage', 'admin_manage']
    }]
});

// 신고 자동 처리 규칙 스키마
const reportRuleSchema = new mongoose.Schema({
    type: { type: String, enum: ['spam', 'abuse', 'inappropriate'], required: true },
    threshold: { type: Number, required: true }, // 처리 기준 횟수
    action: { type: String, enum: ['warn', 'block', 'delete'], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const AdminLevel = mongoose.model('AdminLevel', adminLevelSchema);
const ReportRule = mongoose.model('ReportRule', reportRuleSchema);

// 파일 업로드 API
app.post('/api/chat/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, type: req.file.mimetype, name: req.file.originalname });
    } catch (error) {
        logger.error('파일 업로드 실패:', error);
        res.status(500).json({ error: '파일 업로드에 실패했습니다.' });
    }
});

// 그룹채팅방 생성 API
app.post('/api/chat/groups', authenticateToken, async (req, res) => {
    try {
        const room = new ChatRoom({
            type: 'group',
            name: req.body.name,
            participants: [req.user.id, ...req.body.participants],
            admin: req.user.id
        });
        await room.save();
        res.status(201).json(room);
    } catch (error) {
        logger.error('그룹채팅방 생성 실패:', error);
        res.status(500).json({ error: '그룹채팅방 생성에 실패했습니다.' });
    }
});

// 통계 리포트 생성 API
app.get('/api/admin/reports/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const startDate = new Date(req.query.start);
        const endDate = new Date(req.query.end);

        const stats = await Report.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgProcessTime: {
                        $avg: {
                            $subtract: ['$updatedAt', '$createdAt']
                        }
                    }
                }
            }
        ]);

        const userStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: {
                            $cond: [
                                { $gt: ['$lastActivityAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.json({
            reportStats: stats,
            userStats: userStats[0],
            period: {
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        logger.error('통계 리포트 생성 실패:', error);
        res.status(500).json({ error: '통계 리포트 생성에 실패했습니다.' });
    }
});

// 신고 자동 처리 규칙 API
app.post('/api/admin/report-rules', authenticateToken, isAdmin, async (req, res) => {
    try {
        const rule = new ReportRule({
            type: req.body.type,
            threshold: req.body.threshold,
            action: req.body.action,
            createdBy: req.user.id
        });
        await rule.save();
        res.status(201).json(rule);
    } catch (error) {
        logger.error('신고 규칙 생성 실패:', error);
        res.status(500).json({ error: '신고 규칙 생성에 실패했습니다.' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`서버가 ${PORT}번 포트에서 실행중입니다.`)); 