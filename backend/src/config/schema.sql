--

-- --------------------------------------------------------

--
-- Table structure for table `ai_conversations`
--

CREATE TABLE `ai_conversations` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `course_id` char(36) DEFAULT NULL,
  `lesson_id` char(36) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_conversations`
--

INSERT IGNORE INTO `ai_conversations` (`id`, `user_id`, `course_id`, `lesson_id`, `title`, `created_at`, `updated_at`) VALUES
('2bf49100-ee23-480e-82e6-749dfbc1db99', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Create a quiz to test my understanding', '2026-06-06 22:33:42', '2026-06-06 22:33:42'),
('39501cb0-8dd4-45a4-86f6-8ea5e9747f6b', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Create a quiz to test my understanding', '2026-06-07 18:30:35', '2026-06-07 18:30:35'),
('3c43864e-545d-4ba1-a705-ec247fbddcbd', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:24:46', '2026-06-06 22:24:46'),
('3d02533b-f021-42d5-9f5f-58fa6866ad18', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 21:51:02', '2026-06-06 21:51:02'),
('40cb714b-6280-4f29-95b9-04115bc0dfa2', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Explain this concept with a simple example', '2026-06-06 21:58:39', '2026-06-06 21:58:39'),
('498c9ccb-5314-436b-96a3-3d2e55cfcb01', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:16:43', '2026-06-06 22:16:43'),
('5621d4e7-1b82-412e-8af7-70392625e222', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'what is biology', '2026-06-06 21:50:36', '2026-06-06 21:50:36'),
('58e8327f-7b87-4829-80fe-35a4d244ebf8', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Create a quiz to test my understanding', '2026-06-06 22:33:47', '2026-06-06 22:33:47'),
('5912fd29-9a89-4446-b4b3-33993c9f36e4', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 21:58:42', '2026-06-06 21:58:42'),
('5b8a97a1-1260-498f-97c4-8f4b48c970df', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:22:55', '2026-06-06 22:22:55'),
('73c4036b-1258-4741-be31-2efb656e68e2', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 21:56:54', '2026-06-06 21:56:54'),
('76ca82c3-9751-4c3e-9e0d-0366787dcd3d', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:14:47', '2026-06-06 22:14:47'),
('997c9bc0-9ed4-4b25-8a2c-ffe190b53950', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'what is biology', '2026-06-06 21:56:48', '2026-06-06 21:56:48'),
('9baa0bc2-2413-4b54-98a7-31b39eb635ac', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What should I learn next after this?', '2026-06-06 22:33:45', '2026-06-06 22:33:45'),
('a332b860-2e47-488a-bf4c-27f192cd6ea8', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Create a quiz to test my understanding', '2026-06-06 22:11:20', '2026-06-06 22:11:20'),
('a5c84fc5-7779-4d72-9d14-d4a602be2e69', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'Explain this concept with a simple example', '2026-06-06 21:50:58', '2026-06-06 21:50:58'),
('ba68a4ad-90d5-4397-b29c-cb6e35019ee2', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:11:16', '2026-06-06 22:11:16'),
('ecd271dc-e7fc-4509-9e1d-e6a6298d1eca', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, NULL, 'What are the best practices for this topic?', '2026-06-06 22:33:36', '2026-06-06 22:33:36');

-- --------------------------------------------------------

--
-- Table structure for table `ai_messages`
--

CREATE TABLE `ai_messages` (
  `id` char(36) NOT NULL,
  `conversation_id` char(36) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` longtext NOT NULL,
  `tokens_used` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assessments`
--

CREATE TABLE `assessments` (
  `id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `lesson_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('quiz','coding','project','exam') NOT NULL DEFAULT 'quiz',
  `instructions` text DEFAULT NULL,
  `time_limit` int(11) DEFAULT NULL,
  `passing_score` tinyint(4) NOT NULL DEFAULT 70,
  `max_attempts` int(11) NOT NULL DEFAULT 3,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assessment_attempts`
--

CREATE TABLE `assessment_attempts` (
  `id` char(36) NOT NULL,
  `assessment_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `answers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answers`)),
  `score` decimal(5,2) DEFAULT NULL,
  `passed` tinyint(1) DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `submitted_at` datetime DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  `feedback` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `badges`
--

CREATE TABLE `badges` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon_url` varchar(500) DEFAULT NULL,
  `badge_condition` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`badge_condition`)),
  `points` int(11) NOT NULL DEFAULT 0,
  `rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `badges`
--

INSERT IGNORE INTO `badges` (`id`, `name`, `description`, `icon_url`, `badge_condition`, `points`, `rarity`, `created_at`) VALUES
('076bfd7c-5fbf-11f1-b16a-80e82c533439', 'First Step', 'Complete your first lesson', NULL, NULL, 10, 'common', '2026-06-04 03:42:25'),
('076c1b62-5fbf-11f1-b16a-80e82c533439', 'Quick Learner', 'Complete 5 courses', NULL, NULL, 50, 'rare', '2026-06-04 03:42:25'),
('076c1d41-5fbf-11f1-b16a-80e82c533439', 'Code Warrior', 'Submit 10 coding challenges', NULL, NULL, 100, 'rare', '2026-06-04 03:42:25'),
('076c1e55-5fbf-11f1-b16a-80e82c533439', 'Community Hero', 'Get 50 upvotes on forum posts', NULL, NULL, 150, 'epic', '2026-06-04 03:42:25'),
('076c1f16-5fbf-11f1-b16a-80e82c533439', 'Top Achiever', 'Earn 10 certificates', NULL, NULL, 500, 'legendary', '2026-06-04 03:42:25');

-- --------------------------------------------------------

--
-- Table structure for table `certificates`
--

CREATE TABLE `certificates` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `template_id` char(36) DEFAULT NULL,
  `verify_token` varchar(64) NOT NULL,
  `issued_at` datetime NOT NULL DEFAULT current_timestamp(),
  `pdf_url` varchar(500) DEFAULT NULL,
  `is_valid` tinyint(1) NOT NULL DEFAULT 1,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coupons`
--

CREATE TABLE `coupons` (
  `id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('percent','fixed') NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL,
  `max_uses` int(11) DEFAULT NULL,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `course_id` char(36) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` char(36) NOT NULL,
  `school_id` char(36) NOT NULL,
  `instructor_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `short_desc` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `preview_url` varchar(500) DEFAULT NULL,
  `level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `type` enum('self_paced','live','hybrid') NOT NULL DEFAULT 'self_paced',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'USD',
  `is_free` tinyint(1) NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `duration_hours` decimal(5,1) DEFAULT NULL,
  `total_lessons` int(11) NOT NULL DEFAULT 0,
  `total_students` int(11) NOT NULL DEFAULT 0,
  `avg_rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_reviews` int(11) NOT NULL DEFAULT 0,
  `language` varchar(10) NOT NULL DEFAULT 'en',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`requirements`)),
  `objectives` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`objectives`)),
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_desc` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `published_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `enrollments`
--

CREATE TABLE `enrollments` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `payment_id` char(36) DEFAULT NULL,
  `progress_pct` tinyint(4) NOT NULL DEFAULT 0,
  `last_lesson_id` char(36) DEFAULT NULL,
  `enrolled_at` datetime NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `forum_categories`
--

CREATE TABLE `forum_categories` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `post_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `forum_categories`
--

INSERT IGNORE INTO `forum_categories` (`id`, `name`, `slug`, `description`, `icon`, `color`, `sort_order`, `post_count`) VALUES
('0764bbf9-5fbf-11f1-b16a-80e82c533439', 'General Discussion', 'general', 'Talk about anything tech related', 'message-circle', '#6366f1', 1, 1),
('0764d425-5fbf-11f1-b16a-80e82c533439', 'Programming Help', 'programming-help', 'Get help with your code', 'code', '#06b6d4', 2, 0),
('0764d619-5fbf-11f1-b16a-80e82c533439', 'Project Showcase', 'projects', 'Show off what you have built', 'star', '#f59e0b', 3, 0),
('0764d742-5fbf-11f1-b16a-80e82c533439', 'Career Advice', 'career', 'Jobs, interviews, career growth', 'briefcase', '#10b981', 4, 0),
('0764d845-5fbf-11f1-b16a-80e82c533439', 'AI & Machine Learning', 'ai-ml', 'Discuss AI tools and research', 'brain', '#8b5cf6', 5, 0),
('0764d92e-5fbf-11f1-b16a-80e82c533439', 'Hackathons & Events', 'events', 'Upcoming tech events and challenges', 'calendar', '#ef4444', 6, 0);

-- --------------------------------------------------------

--
-- Table structure for table `forum_posts`
--

CREATE TABLE `forum_posts` (
  `id` char(36) NOT NULL,
  `category_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `parent_id` char(36) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `body` longtext NOT NULL,
  `type` enum('question','discussion','project','announcement') NOT NULL DEFAULT 'discussion',
  `vote_count` int(11) NOT NULL DEFAULT 0,
  `reply_count` int(11) NOT NULL DEFAULT 0,
  `view_count` int(11) NOT NULL DEFAULT 0,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `is_answered` tinyint(1) NOT NULL DEFAULT 0,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `forum_posts`
--

INSERT IGNORE INTO `forum_posts` (`id`, `category_id`, `user_id`, `parent_id`, `title`, `body`, `type`, `vote_count`, `reply_count`, `view_count`, `is_pinned`, `is_answered`, `is_deleted`, `tags`, `created_at`, `updated_at`) VALUES
('090b2809-50d7-440e-916a-8dc058cdf393', '0764bbf9-5fbf-11f1-b16a-80e82c533439', '2ff65979-780e-4328-a361-0a2e9310c6ae', NULL, 'Technology Industry & Investment Update (June 2026)', 'The biggest money in tech right now is flowing into Artificial Intelligence infrastructure, not consumer apps. Companies are spending hundreds of billions of dollars on AI data centers, chips, networking equipment, and power infrastructure.\n\n🔥 Hottest Tech Sectors\n1. AI Infrastructure (Highest Momentum)\nAI chip demand remains extremely strong.\nData center construction is accelerating worldwide.\nCloud providers are spending record amounts on AI computing power.\nSemiconductor manufacturers and suppliers are major beneficiaries.\n\nCompanies investors are watching:\n\nNVIDIA\nTSMC\nBroadcom\nAMD\nMicron Technology\n2. Data Centers & Power\n\nAI requires enormous electricity and cooling capacity.\n\nInvestment themes:\n\nData centers\nPower generation\nGrid infrastructure\nEnergy storage\nCooling technology\n\nSeveral reports indicate AI-related infrastructure spending could exceed $600 billion in 2026 alone.\n\n3. Semiconductor Equipment\n\nAs chip production expands, manufacturers need more fabrication equipment.\n\nKey beneficiaries include:\n\nKLA Corporation\nASML\nApplied Materials\n\nThese companies earn money regardless of which chipmaker wins.', 'discussion', 1, 0, 0, 0, 0, 0, '[]', '2026-06-07 18:34:24', '2026-06-07 18:34:32');

-- --------------------------------------------------------

--
-- Table structure for table `forum_votes`
--

CREATE TABLE `forum_votes` (
  `id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `value` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `forum_votes`
--

INSERT IGNORE INTO `forum_votes` (`id`, `post_id`, `user_id`, `value`) VALUES
('57f52409-3b7e-4760-be92-1c5450b10fbb', '090b2809-50d7-440e-916a-8dc058cdf393', '2ff65979-780e-4328-a361-0a2e9310c6ae', 1);

-- --------------------------------------------------------

--
-- Table structure for table `job_listings`
--

CREATE TABLE `job_listings` (
  `id` char(36) NOT NULL,
  `posted_by` char(36) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_logo` varchar(500) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `type` enum('full_time','part_time','contract','internship','remote') NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `salary_min` decimal(10,2) DEFAULT NULL,
  `salary_max` decimal(10,2) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'USD',
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `apply_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `view_count` int(11) NOT NULL DEFAULT 0,
  `apply_count` int(11) NOT NULL DEFAULT 0,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` char(36) NOT NULL,
  `section_id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('video','text','quiz','coding','live','resource') NOT NULL DEFAULT 'video',
  `content_url` varchar(500) DEFAULT NULL,
  `content_body` longtext DEFAULT NULL,
  `duration_sec` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_preview` tinyint(1) NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `resources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`resources`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lesson_progress`
--

CREATE TABLE `lesson_progress` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `lesson_id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `watch_pct` tinyint(4) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `live_sessions`
--

CREATE TABLE `live_sessions` (
  `id` char(36) NOT NULL,
  `course_id` char(36) DEFAULT NULL,
  `instructor_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `duration_min` int(11) NOT NULL DEFAULT 60,
  `status` enum('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
  `livekit_room_id` varchar(255) DEFAULT NULL,
  `rtmp_key` varchar(255) DEFAULT NULL,
  `recording_url` varchar(500) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `max_participants` int(11) NOT NULL DEFAULT 500,
  `current_participants` int(11) NOT NULL DEFAULT 0,
  `is_recorded` tinyint(1) NOT NULL DEFAULT 1,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `live_sessions`
--

INSERT IGNORE INTO `live_sessions` (`id`, `course_id`, `instructor_id`, `title`, `description`, `scheduled_at`, `duration_min`, `status`, `livekit_room_id`, `rtmp_key`, `recording_url`, `thumbnail_url`, `max_participants`, `current_participants`, `is_recorded`, `is_public`, `price`, `started_at`, `ended_at`, `created_at`) VALUES
('ebf3dea9-40da-40d6-b387-c07f6a03c287', NULL, '2ff65979-780e-4328-a361-0a2e9310c6ae', 'COMPUTER CRAFT', 'HARDWARE', '2026-06-07 16:55:00', 60, 'live', 'room-ebf3dea9-40da-40d6-b387-c07f6a03c287', 'sk_e0f241d95ef64407b989adfd6659ff68', NULL, NULL, 100, 0, 1, 1, 0.00, '2026-06-07 17:55:13', NULL, '2026-06-07 17:51:30');

-- --------------------------------------------------------

--
-- Table structure for table `mentorship_bookings`
--

CREATE TABLE `mentorship_bookings` (
  `id` char(36) NOT NULL,
  `mentor_id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `payment_id` char(36) DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `duration_min` int(11) NOT NULL DEFAULT 60,
  `topic` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `meet_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
  `student_rating` tinyint(4) DEFAULT NULL,
  `student_review` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mentor_availability`
--

CREATE TABLE `mentor_availability` (
  `id` char(36) NOT NULL,
  `mentor_id` char(36) NOT NULL,
  `day_of_week` tinyint(4) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `mentor_profiles`
--

CREATE TABLE `mentor_profiles` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `hourly_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'USD',
  `specialties` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialties`)),
  `experience_yrs` int(11) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `timezone` varchar(50) NOT NULL DEFAULT 'UTC',
  `avg_rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_sessions` int(11) NOT NULL DEFAULT 0,
  `bio` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `course_id` char(36) DEFAULT NULL,
  `session_id` char(36) DEFAULT NULL,
  `provider` enum('stripe','paystack','flutterwave') NOT NULL,
  `provider_ref` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'USD',
  `status` enum('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
  `type` enum('course','subscription','session','tip') NOT NULL DEFAULT 'course',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` char(36) NOT NULL,
  `assessment_id` char(36) NOT NULL,
  `type` enum('mcq','multi_select','short_answer','coding','essay') NOT NULL DEFAULT 'mcq',
  `question_text` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `correct_answer` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`correct_answer`)),
  `explanation` text DEFAULT NULL,
  `points` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT IGNORE INTO `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `created_at`) VALUES
('20ae53e6-e6a4-40d3-9684-d928daff4bd3', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDcxNTM4OCwiZXhwIjoxNzgzMzA3Mzg4fQ.4O2e20PyRpTjcfjS4Ojk-7eNyfraelwIIno4JbgIAdk', '2026-07-06 03:09:48', '2026-06-06 04:09:48'),
('2ae2fe82-9629-48f2-868c-7f303137d649', '52789667-31a6-4ca5-82bf-34b96c3c775d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1Mjc4OTY2Ny0zMWE2LTRjYTUtODJiZi0zNGI5NmMzYzc3NWQiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDc2MzY2MCwiZXhwIjoxNzgzMzU1NjYwfQ.bkYEuu9UG9phcQfjst8DjgZ7yaTIDKX9GyoaYFLiQ9s', '2026-07-06 16:34:20', '2026-06-06 17:34:20'),
('2d020457-5248-4810-9e53-7139ef61eca1', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDc0NjQzNCwiZXhwIjoxNzgzMzM4NDM0fQ.5BujbXh-79L8uR6XKKo06A7XBTYr-9n2oFkZcNVRBpc', '2026-07-06 11:47:14', '2026-06-06 12:47:14'),
('339aff8d-a302-4a7f-aaf8-5f20480c87d7', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODA3ODA0NzEsImV4cCI6MTc4MzM3MjQ3MX0.gKsqjONT_RcgvL7l4V2kImoamh2E6LwcFBN3fRKnV9I', '2026-07-06 21:14:31', '2026-06-06 22:14:31'),
('477dbbb6-5af4-4408-9fa4-e3418b196fa6', '5299839e-8c7c-4d5b-a5fb-3c9f0a634d3b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1Mjk5ODM5ZS04YzdjLTRkNWItYTVmYi0zYzlmMGE2MzRkM2IiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDgxNTQ5MywiZXhwIjoxNzgzNDA3NDkzfQ.NHO0PPQbnLoshr3AF4C_mh4GqY_uIvMBL-Tojm59Ues', '2026-07-07 06:58:13', '2026-06-07 07:58:13'),
('4c9265b6-d5f8-4506-b10a-5a0d755d4179', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDc0NTQ5OCwiZXhwIjoxNzgzMzM3NDk4fQ.yj4aa5vVTcMrZapLltTzcPeDyJtCkvqtl_9iKgqCKYQ', '2026-07-06 11:31:38', '2026-06-06 12:31:38'),
('6af0409d-6caa-49d5-8ca6-df08b8c69bcd', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODA4NTM0MzIsImV4cCI6MTc4MzQ0NTQzMn0.zCgzab5UTuVcqegO2TDqFZFLeScXnfzkx_a48xbPZ3c', '2026-07-07 17:30:32', '2026-06-07 18:30:32'),
('7c1533f2-f5bd-4710-9a43-2902b74b381f', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODA4NTQzNDEsImV4cCI6MTc4MzQ0NjM0MX0.Qt8D5PHOk-pGkqqCqvsAOVWQ-39mqOsAlIGrKZetmzM', '2026-07-07 17:45:41', '2026-06-07 18:45:41'),
('8fc8cad1-f5fe-4f11-97a5-6afbe33c8541', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODA3ODE2MTUsImV4cCI6MTc4MzM3MzYxNX0.2wPOQNWpW_ARKe_zQaNVKqgth9lpV8LR5Yt8GiC0Nz0', '2026-07-06 21:33:35', '2026-06-06 22:33:35'),
('a73f59ce-15a0-4636-9e6b-e38bf58cdd4e', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc4MDczMTEwNSwiZXhwIjoxNzgzMzIzMTA1fQ.bEHqOsGEsuwN-Of4i2ru3QJMXNsoXOjrefHThODiGJg', '2026-07-06 07:31:45', '2026-06-06 08:31:45'),
('e40d4f76-2dca-414d-b0d4-186316295dbc', '2ff65979-780e-4328-a361-0a2e9310c6ae', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZmY2NTk3OS03ODBlLTQzMjgtYTM2MS0wYTJlOTMxMGM2YWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODA4NTQzNDEsImV4cCI6MTc4MzQ0NjM0MX0.Qt8D5PHOk-pGkqqCqvsAOVWQ-39mqOsAlIGrKZetmzM', '2026-07-07 17:45:41', '2026-06-07 18:45:41');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `review` text DEFAULT NULL,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT IGNORE INTO `schools` (`id`, `name`, `slug`, `description`, `icon`, `color`, `is_active`, `sort_order`, `created_at`) VALUES
('075e1118-5fbf-11f1-b16a-80e82c533439', 'Software Engineering', 'software-engineering', 'HTML, CSS, JavaScript, React, Node.js, Python, PHP', 'code', '#6366f1', 1, 1, '2026-06-04 03:42:24'),
('075e8af4-5fbf-11f1-b16a-80e82c533439', 'Artificial Intelligence', 'artificial-intelligence', 'ML, Deep Learning, Generative AI, Prompt Engineering', 'brain', '#8b5cf6', 1, 2, '2026-06-04 03:42:24'),
('075e8dd5-5fbf-11f1-b16a-80e82c533439', 'Data Science', 'data-science', 'Excel, SQL, Power BI, Tableau, Python Analytics', 'chart-bar', '#06b6d4', 1, 3, '2026-06-04 03:42:24'),
('075e8f26-5fbf-11f1-b16a-80e82c533439', 'Cybersecurity', 'cybersecurity', 'Ethical Hacking, Network Security, SOC, Digital Forensics', 'shield', '#ef4444', 1, 4, '2026-06-04 03:42:24'),
('075e9098-5fbf-11f1-b16a-80e82c533439', 'Cloud Computing', 'cloud-computing', 'AWS, Azure, Google Cloud, DevOps, Kubernetes', 'cloud', '#f59e0b', 1, 5, '2026-06-04 03:42:24'),
('075e919e-5fbf-11f1-b16a-80e82c533439', 'Product Design', 'product-design', 'UI/UX Design, Figma, Design Systems', 'palette', '#ec4899', 1, 6, '2026-06-04 03:42:24'),
('075e92a3-5fbf-11f1-b16a-80e82c533439', 'Digital Skills', 'digital-skills', 'Digital Marketing, Content Creation, Social Media', 'megaphone', '#10b981', 1, 7, '2026-06-04 03:42:24');

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` char(36) NOT NULL,
  `course_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `session_participants`
--

CREATE TABLE `session_participants` (
  `id` char(36) NOT NULL,
  `session_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `left_at` datetime DEFAULT NULL,
  `duration_sec` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `social_connections`
--

CREATE TABLE `social_connections` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `platform` enum('youtube','facebook','instagram','tiktok','linkedin','custom') NOT NULL,
  `platform_name` varchar(255) DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `channel_id` varchar(255) DEFAULT NULL,
  `channel_name` varchar(255) DEFAULT NULL,
  `rtmp_url` varchar(500) DEFAULT NULL,
  `stream_key` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stream_targets`
--

CREATE TABLE `stream_targets` (
  `id` char(36) NOT NULL,
  `session_id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `status` enum('pending','active','error','ended') NOT NULL DEFAULT 'pending',
  `viewer_count` int(11) NOT NULL DEFAULT 0,
  `error_msg` text DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `role` enum('student','instructor','mentor','admin') NOT NULL DEFAULT 'student',
  `oauth_provider` enum('local','google','github') DEFAULT NULL,
  `oauth_id` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `headline` varchar(255) DEFAULT NULL,
  `website_url` varchar(500) DEFAULT NULL,
  `linkedin_url` varchar(500) DEFAULT NULL,
  `github_url` varchar(500) DEFAULT NULL,
  `subscription_tier` enum('free','basic','pro','enterprise') NOT NULL DEFAULT 'free',
  `subscription_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verify_token` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `avatar_url`, `role`, `oauth_provider`, `oauth_id`, `bio`, `headline`, `website_url`, `linkedin_url`, `github_url`, `subscription_tier`, `subscription_expires_at`, `is_active`, `is_verified`, `verify_token`, `reset_token`, `reset_token_expires`, `last_login_at`, `created_at`, `updated_at`) VALUES
('2ff65979-780e-4328-a361-0a2e9310c6ae', 'ogoike080@gmail.com', NULL, 'ogoike080-gif', '-', 'https://avatars.githubusercontent.com/u/263050465?v=4', 'admin', 'github', '263050465', NULL, NULL, NULL, NULL, 'https://github.com/ogoike080-gif', 'free', NULL, 1, 1, NULL, NULL, NULL, '2026-06-07 17:46:39', '2026-06-06 04:09:48', '2026-06-07 17:46:39'),
('52789667-31a6-4ca5-82bf-34b96c3c775d', 'ogotech7@gmail.com', '$2a$12$2kma9l/zkia2nysUfDJ0L.cV7ozrVCg/x9rRIiP25p6uJhMLI2EzK', 'ogo', 'ike', NULL, 'student', 'local', NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, 1, 0, 'fcdac1fc-22e7-4adf-88fc-bdb0977f0594', NULL, NULL, '2026-06-06 21:15:58', '2026-06-06 17:34:19', '2026-06-06 21:15:58'),
('5299839e-8c7c-4d5b-a5fb-3c9f0a634d3b', 'gentlebbreez@gmail.com', '$2a$12$z1EeU1gYM4wGUtmvFUmamesO/8QXJBo/3xMZ4e1HGUuLTnP42533q', 'chisom', 'Ebe', NULL, 'student', 'local', NULL, NULL, NULL, NULL, NULL, NULL, 'free', NULL, 1, 0, '49ca9f39-0eeb-49bf-abb1-20f37fb99c3a', NULL, NULL, '2026-06-07 07:58:22', '2026-06-07 07:58:13', '2026-06-07 07:58:22'),
('d3e058e6-0fb5-42ae-812a-a92949f695a3', 'benwill952@gmail.com', NULL, 'Benwill', '', 'https://lh3.googleusercontent.com/a/ACg8ocJvEjjePs1Fnt8kku2TGr4yzb-wMhHdZrKn2NJ-T7Q2jqBIWg=s96-c', 'student', 'google', '108128768225320112956', NULL, NULL, NULL, NULL, NULL, 'free', NULL, 1, 1, NULL, NULL, NULL, '2026-06-07 07:54:50', '2026-06-06 21:49:05', '2026-06-07 07:54:50');

-- --------------------------------------------------------

--
-- Table structure for table `user_badges`
--

CREATE TABLE `user_badges` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `badge_id` char(36) NOT NULL,
  `earned_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_points`
--

CREATE TABLE `user_points` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(255) DEFAULT NULL,
  `ref_type` varchar(50) DEFAULT NULL,
  `ref_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_conversations`
--
ALTER TABLE `ai_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aic_user` (`user_id`);

--
-- Indexes for table `ai_messages`
--
ALTER TABLE `ai_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aim_conv` (`conversation_id`);

--
-- Indexes for table `assessments`
--
ALTER TABLE `assessments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `lesson_id` (`lesson_id`);

--
-- Indexes for table `assessment_attempts`
--
ALTER TABLE `assessment_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aa_user` (`user_id`),
  ADD KEY `idx_aa_assessment` (`assessment_id`);

--
-- Indexes for table `badges`
--
ALTER TABLE `badges`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `certificates`
--
ALTER TABLE `certificates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_cert_token` (`verify_token`),
  ADD UNIQUE KEY `uk_cert_user_course` (`user_id`,`course_id`),
  ADD KEY `idx_certs_user` (`user_id`),
  ADD KEY `idx_certs_course` (`course_id`);

--
-- Indexes for table `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_coupons_code` (`code`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_courses_slug` (`slug`),
  ADD KEY `idx_courses_school` (`school_id`),
  ADD KEY `idx_courses_instructor` (`instructor_id`),
  ADD KEY `idx_courses_type` (`type`),
  ADD KEY `idx_courses_published` (`is_published`);

--
-- Indexes for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_enrollments` (`user_id`,`course_id`),
  ADD KEY `idx_enrollments_user` (`user_id`),
  ADD KEY `idx_enrollments_course` (`course_id`);

--
-- Indexes for table `forum_categories`
--
ALTER TABLE `forum_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_fc_slug` (`slug`);

--
-- Indexes for table `forum_posts`
--
ALTER TABLE `forum_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fp_category` (`category_id`),
  ADD KEY `idx_fp_user` (`user_id`),
  ADD KEY `idx_fp_parent` (`parent_id`);

--
-- Indexes for table `forum_votes`
--
ALTER TABLE `forum_votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_fv` (`post_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `job_listings`
--
ALTER TABLE `job_listings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jl_active` (`is_active`),
  ADD KEY `posted_by` (`posted_by`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lessons_section` (`section_id`),
  ADD KEY `idx_lessons_course` (`course_id`);

--
-- Indexes for table `lesson_progress`
--
ALTER TABLE `lesson_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_lesson_progress` (`user_id`,`lesson_id`),
  ADD KEY `idx_lp_user` (`user_id`),
  ADD KEY `idx_lp_course` (`course_id`),
  ADD KEY `lesson_id` (`lesson_id`);

--
-- Indexes for table `live_sessions`
--
ALTER TABLE `live_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ls_instructor` (`instructor_id`),
  ADD KEY `idx_ls_course` (`course_id`),
  ADD KEY `idx_ls_status` (`status`),
  ADD KEY `idx_ls_scheduled` (`scheduled_at`);

--
-- Indexes for table `mentorship_bookings`
--
ALTER TABLE `mentorship_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mb_mentor` (`mentor_id`),
  ADD KEY `idx_mb_student` (`student_id`);

--
-- Indexes for table `mentor_availability`
--
ALTER TABLE `mentor_availability`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ma_mentor` (`mentor_id`);

--
-- Indexes for table `mentor_profiles`
--
ALTER TABLE `mentor_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_mp_user` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_user` (`user_id`),
  ADD KEY `idx_notif_unread` (`user_id`,`is_read`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_user` (`user_id`),
  ADD KEY `idx_payments_status` (`status`),
  ADD KEY `idx_payments_ref` (`provider_ref`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assessment_id` (`assessment_id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_refresh_user` (`user_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_reviews` (`course_id`,`user_id`),
  ADD KEY `idx_reviews_course` (`course_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_schools_slug` (`slug`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sections_course` (`course_id`);

--
-- Indexes for table `session_participants`
--
ALTER TABLE `session_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_session_user` (`session_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `social_connections`
--
ALTER TABLE `social_connections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sc_user` (`user_id`);

--
-- Indexes for table `stream_targets`
--
ALTER TABLE `stream_targets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `connection_id` (`connection_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_subscription` (`subscription_tier`);

--
-- Indexes for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_ub` (`user_id`,`badge_id`),
  ADD KEY `badge_id` (`badge_id`);

--
-- Indexes for table `user_points`
--
ALTER TABLE `user_points`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_up_user` (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_conversations`
--
ALTER TABLE `ai_conversations`
  ADD CONSTRAINT `ai_conversations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `ai_messages`
--
ALTER TABLE `ai_messages`
  ADD CONSTRAINT `ai_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assessments`
--
ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `assessments_ibfk_2` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`);

--
-- Constraints for table `assessment_attempts`
--
ALTER TABLE `assessment_attempts`
  ADD CONSTRAINT `assessment_attempts_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`),
  ADD CONSTRAINT `assessment_attempts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `certificates`
--
ALTER TABLE `certificates`
  ADD CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `certificates_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  ADD CONSTRAINT `courses_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `enrollments`
--
ALTER TABLE `enrollments`
  ADD CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `forum_posts`
--
ALTER TABLE `forum_posts`
  ADD CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `forum_categories` (`id`),
  ADD CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `forum_votes`
--
ALTER TABLE `forum_votes`
  ADD CONSTRAINT `forum_votes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_posts` (`id`),
  ADD CONSTRAINT `forum_votes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `job_listings`
--
ALTER TABLE `job_listings`
  ADD CONSTRAINT `job_listings_ibfk_1` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `lessons`
--
ALTER TABLE `lessons`
  ADD CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lesson_progress`
--
ALTER TABLE `lesson_progress`
  ADD CONSTRAINT `lesson_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lesson_progress_ibfk_2` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`);

--
-- Constraints for table `live_sessions`
--
ALTER TABLE `live_sessions`
  ADD CONSTRAINT `live_sessions_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `live_sessions_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `mentorship_bookings`
--
ALTER TABLE `mentorship_bookings`
  ADD CONSTRAINT `mentorship_bookings_ibfk_1` FOREIGN KEY (`mentor_id`) REFERENCES `mentor_profiles` (`id`),
  ADD CONSTRAINT `mentorship_bookings_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `mentor_availability`
--
ALTER TABLE `mentor_availability`
  ADD CONSTRAINT `mentor_availability_ibfk_1` FOREIGN KEY (`mentor_id`) REFERENCES `mentor_profiles` (`id`);

--
-- Constraints for table `mentor_profiles`
--
ALTER TABLE `mentor_profiles`
  ADD CONSTRAINT `mentor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `sections_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `session_participants`
--
ALTER TABLE `session_participants`
  ADD CONSTRAINT `session_participants_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `live_sessions` (`id`),
  ADD CONSTRAINT `session_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `social_connections`
--
ALTER TABLE `social_connections`
  ADD CONSTRAINT `social_connections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `stream_targets`
--
ALTER TABLE `stream_targets`
  ADD CONSTRAINT `stream_targets_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `live_sessions` (`id`),
  ADD CONSTRAINT `stream_targets_ibfk_2` FOREIGN KEY (`connection_id`) REFERENCES `social_connections` (`id`);

--
-- Constraints for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `user_badges_ibfk_2` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`);

--
-- Constraints for table `user_points`
--
ALTER TABLE `user_points`
  ADD CONSTRAINT `user_points_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

