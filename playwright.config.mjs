import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/ui', timeout:30000, expect:{timeout:7000}, fullyParallel:true,
 forbidOnly:!!process.env.CI, retries:0, workers:process.env.CI?2:3,
 reporter:[['list'],['html',{open:'never'}]],
 use:{trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},launchOptions:{channel:process.env.GYM_BROWSER_CHANNEL||undefined}}},
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1280,height:900},launchOptions:{channel:process.env.GYM_BROWSER_CHANNEL||undefined}}},
  ...(process.env.GYM_WEBKIT==='1'?[{name:'iphone-webkit',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}}]:[])
 ]
});

