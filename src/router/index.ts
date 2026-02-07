import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue'
import { userBeeId, userRole } from '@/services/UserService';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/tab1'
  },
  {
    path: '/onboarding',
    component: () => import('@/views/OnboardingPage.vue')
  },
  {
    path: '/create-id',
    component: () => import('@/views/IdCreationPage.vue')
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      {
        path: '',
        redirect: '/tabs/tab1'
      },
      {
        path: 'tab1',
        component: () => import('@/views/Tab1Page.vue')
      },
      {
        path: 'tab2',
        component: () => import('@/views/Tab2Page.vue')
      },
      {
        path: 'tab1/room/:id',
        component: () => import('@/views/HiveRoomPage.vue')
      },
      {
        path: 'tab3',
        component: () => import('@/views/Tab3Page.vue')
      },
      {
        path: 'customize-bee',
        component: () => import('@/views/BeeCustomizerPage.vue')
      },
      {
        path: 'my-days',
        component: () => import('@/views/MyDaysPage.vue')
      },
      {
        path: 'radar',
        component: () => import('@/views/RadarPage.vue')
      },
      {
        path: 'achievements',
        component: () => import('@/views/AchievementsPage.vue')
      },
      {
        path: 'leaderboard',
        component: () => import('@/views/LeaderboardPage.vue')
      },
      {
        path: 'profile/:beeId',
        component: () => import('@/views/ProfilePage.vue')
      },
      {
        path: 'chat-head-test',
        component: () => import('@/views/ChatHeadTestPage.vue')
      },
      {
        path: 'admin',
        component: () => import('@/views/AdminPage.vue'),
        meta: { requiresAdmin: true }
      },
      {
        path: 'reminders',
        component: () => import('@/views/BuzzRemindersPage.vue')
      },
      {
        path: 'anonymous-inbox',
        component: () => import('@/views/AnonymousInboxPage.vue')
      },
      {
        path: 'anonymous-setup',
        component: () => import('@/views/AnonymousLinkPage.vue')
      },
      {
        path: 'anonymous-send/:beeId',
        component: () => import('@/views/AnonymousSendPage.vue')
      }
    ]
  },
  {
    path: '/legal',
    component: () => import('@/views/LegalPage.vue')
  },
  {
    path: '/rejoin-hive',
    component: () => import('@/views/RejoinHivePage.vue')
  },
  {
    path: '/call',
    component: () => import('@/views/CallPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const hasId = !!userBeeId.value;
  const isAuthPath = ['/onboarding', '/create-id', '/rejoin-hive'].includes(to.path);
  const isPublicPath = to.path === '/legal';

  // 1. Buzz Link Redirect (Handle external visitors to notibee.buzzme/ID)
  const segments = to.path.split('/').filter(s => s.length > 0);
  if (segments.length === 1 && !isAuthPath && !isPublicPath && to.path !== '/') {
    const beeId = segments[0];
    const reserved = ['tabs', 'onboarding', 'create-id', 'legal', 'rejoin-hive', 'call', 'www'];
    if (!reserved.includes(beeId.toLowerCase())) {
      window.location.href = `https://cypherstudio.netlify.app/notibee/${beeId}`;
      return;
    }
  }

  if (!hasId && !isAuthPath && !isPublicPath) {
    // Force onboarding if no ID and not on an allowed path
    next('/onboarding');
  } else if (hasId && isAuthPath) {
    // Skip onboarding/login pages if already has ID
    next('/tabs/tab1');
  } else if (to.meta.requiresAdmin && userRole.value !== 'admin' && userRole.value !== 'super_admin') {
    // Block unauthorized admin access
    next('/tabs/tab1');
  } else {
    // Allow access to the requested route
    next();
  }
});

export default router
