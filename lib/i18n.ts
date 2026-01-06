export type Lang = 'en' | 'zh-TW';

export const SUPPORTED_LANGS: Lang[] = ['en', 'zh-TW'];
export const DEFAULT_LANG: Lang = 'en';

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
};

export function normalizeLang(value?: string | null): Lang {
  if (!value) return DEFAULT_LANG;
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh-TW';
  if (lower.startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

export function detectLangFromAcceptLanguage(header?: string | null): Lang {
  if (!header) return DEFAULT_LANG;
  const parts = header.split(',').map((part) => part.trim().split(';')[0]);
  for (const part of parts) {
    if (!part) continue;
    if (part.toLowerCase().startsWith('zh')) return 'zh-TW';
    if (part.toLowerCase().startsWith('en')) return 'en';
  }
  return DEFAULT_LANG;
}

export function detectLangFromNavigator(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const candidate of candidates) {
    const normalized = normalizeLang(candidate);
    if (SUPPORTED_LANGS.includes(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_LANG;
}

export function appendLangToHref(href: string, lang: Lang): string {
  if (!href) return href;
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }

  const [pathWithQuery, hash] = href.split('#');
  const [pathname, queryString] = pathWithQuery.split('?');
  const params = new URLSearchParams(queryString || '');
  params.set('lang', lang);

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export const MESSAGES = {
  en: {
    language: {
      label: 'Language',
    },
    navbar: {
      forHosts: 'For Hosts',
      getStarted: 'Get Started',
    },
    common: {
      unknown: 'Unknown',
      unknownGroup: 'Unknown Group',
      noEmail: 'No email',
    },
    footer: {
      description:
        'Create your own branded chat community. Connect with your audience through real-time messaging, group chats, and customizable workspaces.',
      product: 'Product',
      features: 'Features',
      forHosts: 'For Hosts',
      forUsers: 'For Users',
      company: 'Company',
      about: 'About',
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: (year: number) => `© ${year} chat. All rights reserved.`,
    },
    landing: {
      heroTitleLine1: 'Build Your Own',
      heroTitleLine2: 'Chat Community',
      heroSubtitle:
        'Create a branded chat platform for your audience. Real-time messaging, group chats, and complete customization—all in one place.',
      startAsHost: 'Start as a Host',
      joinAsUser: 'Join as a User',
      hostsTitle: 'For Hosts',
      hostsDescription:
        'Launch and manage your own chat platform. Customize branding, invite members, moderate conversations, and build your community.',
      hostsFeatureOne: 'Full branding customization',
      hostsFeatureTwo: 'Member management dashboard',
      hostsFeatureThree: 'Spam reporting & moderation',
      hostsCta: 'Get Started as Host',
      usersTitle: 'For Users',
      usersDescription:
        'Join chat communities with a simple invite code. Connect with friends, participate in group chats, and stay in touch effortlessly.',
      usersFeatureOne: 'Real-time messaging',
      usersFeatureTwo: 'Group chat & direct messages',
      usersFeatureThree: 'Join multiple workspaces',
      usersCta: 'Join a Community',
      featuresTitle: 'Everything You Need',
      featuresSubtitle:
        'Powerful features to build and manage thriving chat communities',
      featureBrandingTitle: 'Custom Branding',
      featureBrandingDesc:
        'Personalize your workspace with custom themes, logos, and colors to match your brand identity.',
      featureRealtimeTitle: 'Real-Time Messaging',
      featureRealtimeDesc:
        'Instant message delivery with WebSocket technology for seamless conversations.',
      featureGroupsTitle: 'Group Chats',
      featureGroupsDesc:
        'Create unlimited group conversations for teams, communities, and social groups.',
      featureUsersTitle: 'User Management',
      featureUsersDesc:
        'Control who joins your workspace with invite codes and member management tools.',
      featureSpamTitle: 'Spam Reporting',
      featureSpamDesc:
        'Keep your community safe with built-in spam reporting and moderation features.',
      featureMultiTitle: 'Multi-Platform',
      featureMultiDesc:
        'Works seamlessly on desktop, mobile, and tablet devices with responsive design.',
      ctaTitle: 'Ready to Build Your Community?',
      ctaSubtitle:
        'Start creating your branded chat platform today. No credit card required.',
      ctaButton: 'Get Started Free',
    },
    auth: {
      common: {
        usernameLabel: 'Username',
        usernamePlaceholder: 'johndoe',
        fullNameLabel: 'Full Name',
        fullNamePlaceholder: 'John Doe',
        emailLabel: 'Email',
        emailAddressLabel: 'Email Address',
        emailPlaceholderClient: 'you@example.com',
        emailPlaceholderHost: 'host@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: '••••••••',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        createAccount: 'Create Account',
        pleaseWait: 'Please wait...',
        orUse: 'Or use',
        or: 'Or',
        quickLogin: 'Quick Login (Demo)',
        authFailed: 'Authentication failed',
        loginFailed: 'Login failed. Please try again.',
        networkError: 'Network error. Please try again.',
        quickLoginFailed: 'Quick login failed',
        invalidEmail: 'Please enter a valid email address',
        invalidPassword: 'Invalid password',
        nameRequired: 'Please enter your name',
      },
      client: {
        titleLogin: 'Welcome Back',
        titleRegister: 'Create Account',
        subtitleLogin: 'Sign in to continue chatting',
        subtitleRegister: 'Join chat communities',
        toggleToRegister: "Don't have an account? Sign Up",
        toggleToLogin: 'Already have an account? Sign In',
        backToHome: 'Back to Home',
      },
      host: {
        portalTitle: 'Host Portal',
        subtitleLogin: 'Sign in to your account',
        subtitleRegister: 'Create your host account',
        toggleToRegister: "Don't have an account? Sign up",
        toggleToLogin: 'Already have an account? Sign in',
        clientPortalLink: 'Are you a client? Click here',
      },
    },
    oauth: {
      continueGoogle: 'Continue with Google',
      continueLine: 'Continue with LINE',
    },
    chat: {
      noWorkspaceTitle: 'No Workspace',
      noWorkspaceSubtitle: 'You need to join a workspace to start chatting',
      joinWorkspace: 'Join Workspace',
      stats: (friends: number, groups: number) =>
        `${friends} friends • ${groups} groups`,
      createGroup: 'Create Group',
      createGroupDisabled: 'Group chat disabled by workspace',
      friendRequests: 'Friend Requests',
      addFriends: 'Add Friends',
      logout: 'Logout',
      selectConversationTitle: 'Select a conversation',
      selectConversationSubtitle: 'Choose a friend or group to start chatting',
      joinSuccess: (name: string) => `Successfully joined workspace: ${name}`,
      joinFailure: (error: string) => `Failed to join workspace: ${error}`,
      friendRequestSent: 'Friend request sent successfully!',
      friendRequestFailed: (error: string) =>
        `Failed to send friend request: ${error}`,
      fileUploadFailed: (error: string) => `Failed to upload file: ${error}`,
      createGroupFailed: (error: string) => `Failed to create group: ${error}`,
      unknownError: 'Unknown error',
    },
    conversationList: {
      title: 'Chats',
      searchPlaceholder: 'Search conversations...',
      startChatHint: 'Click to start chatting',
      members: (count: number) => `${count} members`,
      emptyTitle: 'No conversations yet',
      emptySubtitle: 'Add friends to start chatting',
    },
    chatWindow: {
      online: 'Online',
      noMessagesTitle: 'No messages yet',
      noMessagesSubtitle: 'Send a message to start the conversation',
      backLabel: 'Back',
    },
    messageInput: {
      placeholder: 'Type a message...',
      attachFile: 'Attach file',
    },
    friendList: {
      title: 'Add Friends',
      searchPlaceholder: 'Search by name or tag (e.g., username#1234)...',
      adding: 'Adding',
      addFriend: 'Add Friend',
      empty: 'No members found',
    },
    friendRequests: {
      title: 'Friend Requests',
      empty: 'No pending requests',
      wantsToBeFriends: 'wants to be friends',
      accept: 'Accept',
      decline: 'Decline',
    },
    createGroup: {
      title: 'Create Group',
      groupNameLabel: 'Group Name',
      groupNamePlaceholder: 'Enter group name...',
      maxMembers: (max: number) => `Max ${max} members (including you)`,
      searchPlaceholder: 'Search friends...',
      selectedCount: (count: number) =>
        `${count} friend${count === 1 ? '' : 's'} selected`,
      noFriendsFound: 'No friends found',
      noFriendsToAdd: 'No friends to add',
      cancel: 'Cancel',
      create: 'Create Group',
    },
    workspaceSwitcher: {
      title: 'Workspaces',
      emptyTitle: 'No workspaces yet',
      emptySubtitle: 'Join a workspace to start chatting',
      inviteCodeLabel: 'Enter Invite Code',
      join: 'Join',
      cancel: 'Cancel',
      joinWorkspace: '+ Join Workspace',
    },
    hostDashboard: {
      title: 'Host Dashboard',
      createWorkspace: 'Create Workspace',
      workspacesTitle: 'Workspaces',
      noWorkspaces: 'No workspaces yet',
      tabs: {
        overview: 'Overview',
        members: 'Members',
        spam: 'Spam Reports',
        settings: 'Settings',
      },
      overview: {
        slugLabel: 'Slug',
        totalMembers: 'Total Members',
        spamReports: 'Spam Reports',
        inviteCode: 'Invite Code',
        copy: 'Copy',
        copied: 'Invite code copied!',
      },
      members: {
        title: 'Workspace Members',
        joined: (date: string) => `Joined ${date}`,
        empty: 'No members yet',
      },
      spam: {
        title: 'Spam Reports',
        reportedBy: (name: string) => `Reported by ${name}`,
        empty: 'No spam reports',
        status: {
          pending: 'Pending',
          reviewed: 'Reviewed',
          resolved: 'Resolved',
        },
      },
      noWorkspace: {
        title: 'No workspace selected',
        subtitle: 'Create a workspace to get started',
      },
      modal: {
        title: 'Create New Workspace',
        workspaceNameLabel: 'Workspace Name',
        workspaceNamePlaceholder: 'My Awesome Community',
        workspaceNameHelper: 'Choose a unique name for your chat community',
        cancel: 'Cancel',
        create: 'Create Workspace',
        creating: 'Creating...',
      },
      settings: {
        title: 'Workspace Settings',
        subtitle: 'Customize branding and experience for this chat platform.',
        workspaceNameLabel: 'Workspace Name',
        primaryColor: 'Primary Color',
        secondaryColor: 'Secondary Color',
        logoLabel: 'Logo',
        logoPlaceholder: 'https://example.com/logo.png',
        uploadImage: 'Upload Image',
        uploading: 'Uploading...',
        welcomeMessageLabel: 'Welcome Message',
        enableGroupChat: 'Enable group chats',
        maxGroupSize: 'Max Group Size',
        save: 'Save Changes',
        saving: 'Saving...',
        resetDefaults: 'Reset to Defaults',
        logoFallback: 'Logo',
        saved: 'Settings saved',
      },
      errors: {
        workspaceNameRequired: 'Workspace name is required',
        missingToken: 'No authentication token found. Please login again.',
        createFailed: 'Failed to create workspace',
        networkError: 'Network error. Please try again.',
        saveFailed: 'Failed to save settings',
        logoImageOnly: 'Logo must be an image file',
        logoUploadFailed: 'Failed to upload logo',
      },
    },
  },
  'zh-TW': {
    language: {
      label: '語言',
    },
    navbar: {
      forHosts: '主辦者',
      getStarted: '立即開始',
    },
    common: {
      unknown: '未知',
      unknownGroup: '未知群組',
      noEmail: '無 Email',
    },
    footer: {
      description:
        '打造專屬品牌的聊天室社群。透過即時訊息、群組聊天與可自訂的工作區，與你的用戶保持連結。',
      product: '產品',
      features: '功能特色',
      forHosts: '主辦者',
      forUsers: '使用者',
      company: '公司',
      about: '關於我們',
      privacy: '隱私權',
      terms: '服務條款',
      copyright: (year: number) => `© ${year} chat. 版權所有。`,
    },
    landing: {
      heroTitleLine1: '打造你的',
      heroTitleLine2: '聊天社群',
      heroSubtitle:
        '為你的受眾打造品牌化聊天平台。即時訊息、群組聊天與完整客製，一次到位。',
      startAsHost: '以主辦者開始',
      joinAsUser: '以使用者加入',
      hostsTitle: '給主辦者',
      hostsDescription:
        '啟動並管理你的聊天平台。自訂品牌、邀請成員、管理對話，建立你的社群。',
      hostsFeatureOne: '完整品牌自訂',
      hostsFeatureTwo: '成員管理儀表板',
      hostsFeatureThree: '垃圾訊息回報與管理',
      hostsCta: '開始建立主辦平台',
      usersTitle: '給使用者',
      usersDescription:
        '透過邀請碼快速加入社群。與朋友聊天、參與群組，保持順暢連結。',
      usersFeatureOne: '即時訊息',
      usersFeatureTwo: '群組與私人訊息',
      usersFeatureThree: '可加入多個工作區',
      usersCta: '加入社群',
      featuresTitle: '你需要的一切',
      featuresSubtitle: '打造並管理活躍社群的強大功能',
      featureBrandingTitle: '品牌化設計',
      featureBrandingDesc:
        '自訂主題、Logo 與色彩，符合你的品牌識別。',
      featureRealtimeTitle: '即時訊息',
      featureRealtimeDesc: '以 WebSocket 實現即時送達，對話更順暢。',
      featureGroupsTitle: '群組聊天',
      featureGroupsDesc: '建立不限數量的群組對話，適合團隊與社群。',
      featureUsersTitle: '使用者管理',
      featureUsersDesc: '透過邀請碼與管理工具控管加入成員。',
      featureSpamTitle: '垃圾訊息回報',
      featureSpamDesc: '內建回報與管理機制，維持社群安全。',
      featureMultiTitle: '多平台支援',
      featureMultiDesc: '響應式設計，桌機、手機、平板皆順暢使用。',
      ctaTitle: '準備好打造你的社群了嗎？',
      ctaSubtitle: '立即開始建立品牌化聊天平台，不需信用卡。',
      ctaButton: '免費開始',
    },
    auth: {
      common: {
        usernameLabel: '使用者名稱',
        usernamePlaceholder: 'johndoe',
        fullNameLabel: '姓名',
        fullNamePlaceholder: '王小明',
        emailLabel: 'Email',
        emailAddressLabel: 'Email',
        emailPlaceholderClient: 'you@example.com',
        emailPlaceholderHost: 'host@example.com',
        passwordLabel: '密碼',
        passwordPlaceholder: '••••••••',
        signIn: '登入',
        signUp: '註冊',
        createAccount: '建立帳號',
        pleaseWait: '請稍候...',
        orUse: '或使用',
        or: '或',
        quickLogin: '快速登入（Demo）',
        authFailed: '驗證失敗',
        loginFailed: '登入失敗，請再試一次。',
        networkError: '網路錯誤，請稍後再試。',
        quickLoginFailed: '快速登入失敗',
        invalidEmail: '請輸入正確的 Email',
        invalidPassword: '密碼格式不正確',
        nameRequired: '請輸入姓名',
      },
      client: {
        titleLogin: '歡迎回來',
        titleRegister: '建立帳號',
        subtitleLogin: '登入後繼續聊天',
        subtitleRegister: '加入聊天社群',
        toggleToRegister: '還沒有帳號？立即註冊',
        toggleToLogin: '已有帳號？立即登入',
        backToHome: '回到首頁',
      },
      host: {
        portalTitle: '主辦者入口',
        subtitleLogin: '登入你的帳號',
        subtitleRegister: '建立主辦者帳號',
        toggleToRegister: '還沒有帳號？立即註冊',
        toggleToLogin: '已有帳號？立即登入',
        clientPortalLink: '你是使用者嗎？點此進入',
      },
    },
    oauth: {
      continueGoogle: '使用 Google 繼續',
      continueLine: '使用 LINE 繼續',
    },
    chat: {
      noWorkspaceTitle: '尚未加入工作區',
      noWorkspaceSubtitle: '請先加入工作區才能開始聊天',
      joinWorkspace: '加入工作區',
      stats: (friends: number, groups: number) =>
        `${friends} 位好友 • ${groups} 個群組`,
      createGroup: '建立群組',
      createGroupDisabled: '此工作區已關閉群組聊天',
      friendRequests: '好友邀請',
      addFriends: '新增好友',
      logout: '登出',
      selectConversationTitle: '選擇對話',
      selectConversationSubtitle: '選擇好友或群組開始聊天',
      joinSuccess: (name: string) => `成功加入工作區：${name}`,
      joinFailure: (error: string) => `加入工作區失敗：${error}`,
      friendRequestSent: '好友邀請已送出！',
      friendRequestFailed: (error: string) => `好友邀請送出失敗：${error}`,
      fileUploadFailed: (error: string) => `檔案上傳失敗：${error}`,
      createGroupFailed: (error: string) => `建立群組失敗：${error}`,
      unknownError: '未知錯誤',
    },
    conversationList: {
      title: '聊天',
      searchPlaceholder: '搜尋對話...',
      startChatHint: '點擊開始聊天',
      members: (count: number) => `${count} 位成員`,
      emptyTitle: '尚無對話',
      emptySubtitle: '新增好友後即可開始聊天',
    },
    chatWindow: {
      online: '線上',
      noMessagesTitle: '尚無訊息',
      noMessagesSubtitle: '傳送訊息開始對話',
      backLabel: '返回',
    },
    messageInput: {
      placeholder: '輸入訊息...',
      attachFile: '附加檔案',
    },
    friendList: {
      title: '新增好友',
      searchPlaceholder: '以名稱或標籤搜尋（例如 username#1234）...',
      adding: '新增中',
      addFriend: '加好友',
      empty: '找不到成員',
    },
    friendRequests: {
      title: '好友邀請',
      empty: '目前沒有待處理邀請',
      wantsToBeFriends: '想加你為好友',
      accept: '接受',
      decline: '拒絕',
    },
    createGroup: {
      title: '建立群組',
      groupNameLabel: '群組名稱',
      groupNamePlaceholder: '輸入群組名稱...',
      maxMembers: (max: number) => `最多 ${max} 人（含你）`,
      searchPlaceholder: '搜尋好友...',
      selectedCount: (count: number) => `已選 ${count} 位好友`,
      noFriendsFound: '找不到好友',
      noFriendsToAdd: '沒有可加入的好友',
      cancel: '取消',
      create: '建立群組',
    },
    workspaceSwitcher: {
      title: '工作區',
      emptyTitle: '尚未加入工作區',
      emptySubtitle: '加入工作區即可開始聊天',
      inviteCodeLabel: '輸入邀請碼',
      join: '加入',
      cancel: '取消',
      joinWorkspace: '+ 加入工作區',
    },
    hostDashboard: {
      title: '主辦者後台',
      createWorkspace: '建立工作區',
      workspacesTitle: '工作區',
      noWorkspaces: '尚未建立工作區',
      tabs: {
        overview: '總覽',
        members: '成員',
        spam: '垃圾訊息',
        settings: '設定',
      },
      overview: {
        slugLabel: 'Slug',
        totalMembers: '總成員數',
        spamReports: '垃圾訊息回報',
        inviteCode: '邀請碼',
        copy: '複製',
        copied: '邀請碼已複製！',
      },
      members: {
        title: '工作區成員',
        joined: (date: string) => `加入於 ${date}`,
        empty: '尚無成員',
      },
      spam: {
        title: '垃圾訊息回報',
        reportedBy: (name: string) => `由 ${name} 檢舉`,
        empty: '尚無垃圾訊息回報',
        status: {
          pending: '待處理',
          reviewed: '已檢視',
          resolved: '已解決',
        },
      },
      noWorkspace: {
        title: '尚未選擇工作區',
        subtitle: '建立工作區以開始使用',
      },
      modal: {
        title: '建立新工作區',
        workspaceNameLabel: '工作區名稱',
        workspaceNamePlaceholder: '我的社群',
        workspaceNameHelper: '設定獨一無二的社群名稱',
        cancel: '取消',
        create: '建立工作區',
        creating: '建立中...',
      },
      settings: {
        title: '工作區設定',
        subtitle: '自訂品牌與體驗，打造你的聊天平台。',
        workspaceNameLabel: '工作區名稱',
        primaryColor: '主色',
        secondaryColor: '輔色',
        logoLabel: 'Logo',
        logoPlaceholder: 'https://example.com/logo.png',
        uploadImage: '上傳圖片',
        uploading: '上傳中...',
        welcomeMessageLabel: '歡迎訊息',
        enableGroupChat: '開啟群組聊天',
        maxGroupSize: '群組人數上限',
        save: '儲存變更',
        saving: '儲存中...',
        resetDefaults: '重設為預設值',
        logoFallback: 'Logo',
        saved: '設定已儲存',
      },
      errors: {
        workspaceNameRequired: '工作區名稱為必填',
        missingToken: '找不到登入資訊，請重新登入。',
        createFailed: '建立工作區失敗',
        networkError: '網路錯誤，請稍後再試。',
        saveFailed: '儲存設定失敗',
        logoImageOnly: 'Logo 必須為圖片檔',
        logoUploadFailed: 'Logo 上傳失敗',
      },
    },
  },
} as const;

export type Messages = typeof MESSAGES.en;

export function getTranslations(lang: Lang): Messages {
  return MESSAGES[lang] || MESSAGES.en;
}
