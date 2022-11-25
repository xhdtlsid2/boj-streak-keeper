const { By, Builder, Key, WebElement } = require("selenium-webdriver");
require("chromedriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const { setTimeout } = require("timers/promises");
const path = require('path');

const oneDayInMilliseconds = 1000 * 60 * 60 * 24;
const refreshInterval = 1000 * 60 * 25;

/**
 * Logging in by entering id/pw.
 * Won't work when recaptcha appears.
 * So use at your own risk.
 */
async function directLogin(driver){
	const id = "", password = "";
	const loginForm = await driver.findElement(By.id("login_form"));
	await loginForm.findElement(By.name("login_user_id")).sendKeys(id);
	await loginForm.findElement(By.name("login_password")).sendKeys(password);
	// await loginForm.findElement(By.name("auto_login")).click();
	await loginForm.findElement(By.id("submit_button")).click();
	
	// wait for POST and GET done
	await setTimeout(10000);
}

async function autoSubmit(){
	let driver = await new Builder()
		.forBrowser("chrome")
		.setChromeOptions(new chrome.Options().headless())
		.build();

	//login
	await driver.get("https://acmicpc.net/status");
	await driver.manage().deleteCookie("OnlineJudge");
	// to set custom cookie value:
	// 1. go to acmicpc.net
	// 2. if you are already loggin in, logout
	// 3. set the OnlineJudge cookie value to whatever you want
	// 4. login!
	// then you will be able to use your custom cookie value
	const cookie = fs.readFileSync("./cookie.txt").toString();
	await driver.manage().addCookie({name: "OnlineJudge", value: cookie, httpOnly: true});

	let lastRefreshTime = 0, lastSubmitTime = 0;
	while(1){
		let currentTime = Date.now();
		if(currentTime - lastSubmitTime > oneDayInMilliseconds){
			lastSubmitTime = lastRefreshTime = currentTime;
			const files = fs.readdirSync("./sources");
			if(files.length == 0){
				await driver.quit();
				return Promise.reject(new Error("no codes to submit"));
			}
			const problemNo = path.parse(files[0]).name;
			await driver.get("https://acmicpc.net/submit/" + problemNo);
			const submitForm = await driver.findElement(By.id("submit_form"));
			if(path.parse(files[0]).ext == ".py"){
				await submitForm.findElement(By.css(".chosen-search-input")).sendKeys("PyPy3", Key.RETURN);
			}
			const codeMirror = await driver.findElement(By.className("CodeMirror"));
			const sourceCode = fs.readFileSync("./sources/" + files[0]).toString();
			await driver.executeScript("arguments[0].CodeMirror.setValue(arguments[1]);", codeMirror, sourceCode);
			await submitForm.findElement(By.id("submit_button")).click();
			fs.unlinkSync("./sources/" + files[0]);
		}
		else if(currentTime - lastRefreshTime > refreshInterval){
			lastRefreshTime = currentTime;
			await driver.get("https://acmicpc.net/status");		//contains no big images or ads; faster load
		}
	}
}

autoSubmit().catch((error) => {
	console.log(error);
});