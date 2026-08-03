# Push IceBreaker to GitHub Without Cloning

This workflow uses the existing local IceBreaker folder and preserves the remote repository history when it exists.

## 1. Open PowerShell in the project folder

```powershell
cd "D:\path\to\IceBreaker"
```

The current folder must contain `manifest.json`.

## 2. Confirm private files are not present

```powershell
powershell -ExecutionPolicy Bypass -File scripts/github/pre-push-check.ps1
```

Do not continue if it reports `config/.env`, `src/backend/config/official-api-keys.js`, or a likely API key as tracked content.

## 3. Initialise Git

```powershell
git init
git branch -M main
```

## 4. Connect the existing repository

```powershell
git remote add origin https://github.com/anamta-JINX/IceBreaker---Your_Wingman_For_LinkedIn.git
```

When `origin` already exists:

```powershell
git remote set-url origin https://github.com/anamta-JINX/IceBreaker---Your_Wingman_For_LinkedIn.git
```

Verify it:

```powershell
git remote -v
```

## 5. Commit the current folder

```powershell
git add .
git status
git commit -m "Release IceBreaker v1.4.76"
```

Inspect `git status` before committing. The private `.env` and generated key module must not appear.

## 6. Preserve the existing remote history

```powershell
git fetch origin
```

Check whether the remote already has a `main` branch:

```powershell
git branch -r
```

When `origin/main` appears, merge it while preferring the current IceBreaker files in direct conflicts:

```powershell
git merge origin/main --allow-unrelated-histories -X ours -m "Merge existing GitHub history"
```

Review the result:

```powershell
git status
git log --oneline --decorate -8
```

## 7. Push

```powershell
git push -u origin main
```

GitHub may open a browser login or request a personal access token depending on the local Git setup.

## Updating the repository later

```powershell
git add .
git commit -m "Describe the IceBreaker update"
git pull --rebase origin main
git push origin main
```

## Do not use force push casually

Avoid this unless deliberately replacing all remote history:

```powershell
git push --force origin main
```

A forced push can remove commits and files already stored on GitHub.
