# Paycheck planner

A single-page planner for bills, paycheck set-asides, credit card payments, and what is left each week. There is no server. Bills, income, and cards are saved in this browser.

Download a CSV to keep a backup. Upload that same file to restore it, including on another computer.

## Host it on GitHub Pages

1. Merge this branch into `main`.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose branch `main` and folder `/ (root)`, then save.

The site will be published at `https://skylarra.github.io/budget/`.

## Check the math

```sh
node --test planner.test.js
```
