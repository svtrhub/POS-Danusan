      // 5. The central menu spreadsheet is fixed for all devices and teams.
      // Ignore any legacy menu-sheet ID stored by older app versions.
      this.menuSheetId = DEFAULT_MENU_SHEET_ID;
      try {
        localStorage.removeItem('POS_MENU_SHEET');
      } catch (_) {}

