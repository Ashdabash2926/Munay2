/**
 * Munay retreats: validate the sheet and publish it to the website.
 *
 * Paste this into Extensions > Apps Script on the "Munay retreats" sheet, then
 * add the Cloudflare Pages deploy hook under Project Settings > Script
 * properties, with the key DEPLOY_HOOK_URL. The hook never appears in this
 * file, so the script can be shared or copied safely.
 *
 * The validation below deliberately mirrors lib/retreats.mjs in the site repo.
 * If you change the rules in one place, change them in the other, or the button
 * will start refusing rows the site would have accepted, or the reverse.
 */

var SHEET_NAME = 'Retreats';
var COLUMNS = ['Name', 'Start', 'End', 'Location', 'Cost', 'Link', 'Image', 'Status'];
var STATUSES = ['Open', 'A few spaces left', 'Waitlist', 'Full'];
var HOOK_PROPERTY = 'DEPLOY_HOOK_URL';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Munay')
    .addItem('Publish to website', 'publishToWebsite')
    .addToUi();
}

function publishToWebsite() {
  var ui = SpreadsheetApp.getUi();

  var problems = findProblems_();
  if (problems.length) {
    ui.alert('Not published',
      'Please fix these first, then publish again:\n\n' + problems.join('\n\n'),
      ui.ButtonSet.OK);
    return;
  }

  var hook = PropertiesService.getScriptProperties().getProperty(HOOK_PROPERTY);
  if (!hook) {
    ui.alert('Not published',
      'The publish link is missing from this sheet. Please contact your developer.',
      ui.ButtonSet.OK);
    return;
  }

  try {
    var res = UrlFetchApp.fetch(hook, { method: 'post', payload: '', muteHttpExceptions: true });
    if (res.getResponseCode() >= 300) {
      throw new Error('the website replied ' + res.getResponseCode());
    }
    ui.alert('Published',
      'Your changes will be live on the website in about a minute.',
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Not published',
      'Something went wrong: ' + err.message + '\n\nPlease contact your developer.',
      ui.ButtonSet.OK);
  }
}

/**
 * Everything the website checks, checked here first, where she can see it.
 * Returns a list of plain-English problems, empty when the sheet is publishable.
 */
function findProblems_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return ['The tab must be named "' + SHEET_NAME + '".'];

  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return ['The sheet is empty.'];

  var header = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var missing = COLUMNS.filter(function (c) { return header.indexOf(c.toLowerCase()) === -1; });
  if (missing.length) {
    return ['The heading row is missing: ' + missing.join(', ') + '. Please contact your developer.'];
  }

  var at = {};
  COLUMNS.forEach(function (c) { at[c] = header.indexOf(c.toLowerCase()); });

  var today = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var isIso = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v); };
  var problems = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var get = function (c) { return String(row[at[c]] || '').trim(); };

    var filled = COLUMNS.some(function (c) { return get(c) !== ''; });
    if (!filled) continue;

    // A retreat that has already finished is ignored by the website, so it is
    // not checked here either. This lets old rows stay in the sheet as a record
    // without ever blocking a publish.
    if (isIso(get('End')) && get('End') < today) continue;

    var label = 'Row ' + (i + 1) + ' (' + (get('Name') || 'no name yet') + '):\n';

    if (!get('Name')) {
      problems.push(label + 'the name is empty.');
    }
    if (!get('Location')) {
      problems.push(label + 'the location is empty.');
    }

    ['Start', 'End'].forEach(function (c) {
      var v = get(c);
      if (isIso(v)) return;
      if (!v) {
        problems.push(label + 'the ' + c.toLowerCase() + ' date is empty. ' +
          'Click the cell and pick a date from the calendar.');
      } else {
        problems.push(label + 'the ' + c.toLowerCase() + ' date reads "' + v + '". ' +
          'Delete it, then pick the date from the little calendar instead of typing it.');
      }
    });

    if (isIso(get('Start')) && isIso(get('End')) && get('End') < get('Start')) {
      problems.push(label + 'the end date is before the start date.');
    }

    var link = get('Link');
    if (link.indexOf('https://') !== 0) {
      problems.push(label + 'the link must start with https:// (it reads "' + link + '"). ' +
        'Copy it from your browser address bar.');
    }

    var status = get('Status');
    if (status && STATUSES.indexOf(status) === -1) {
      problems.push(label + '"' + status + '" is not one of: ' + STATUSES.join(', ') + '. ' +
        'Pick one from the list in the cell.');
    }
  }

  return problems;
}
