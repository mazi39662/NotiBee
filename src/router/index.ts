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
        path: 'tab2/room/:id',
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
