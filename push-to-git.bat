@echo off
echo ============================================
echo   Kenakini - Git Push Script
echo ============================================
echo.

REM Step 1: Set git identity
echo [1/5] Setting git identity...
git config --global user.name "sohelsokal9-ai"
git config --global user.email "sohelsokal9-ai@users.noreply.github.com"

REM Step 2: Set remote
echo [2/5] Setting remote...
git remote set-url origin https://github.com/sohelsokal9-ai/Ecommerce-Platform.git

REM Step 3: Stage changes
echo [3/5] Staging changes...
git add -A

REM Step 4: Commit
echo [4/5] Committing...
git commit -m "Kenakini - Full stack ecommerce platform with all fixes" --allow-empty

REM Step 5: Push
echo [5/5] Pushing to GitHub...
echo.
echo ============================================
echo   LOGIN with: sohelsokal9-ai account
echo ============================================
echo.
git push -u origin master --force

echo.
echo ============================================
if %ERRORLEVEL% EQU 0 (
    echo   SUCCESS! Check: https://github.com/sohelsokal9-ai/Ecommerce-Platform
) ELSE (
    echo   FAILED! Try manually:
    echo   git push -u origin master
)
echo ============================================
pause
