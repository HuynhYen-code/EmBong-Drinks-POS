// Helper lấy ngày/tháng chuẩn múi giờ Việt Nam (UTC+7)
function getVietnamNow() {
    return new Date(Date.now() + 7 * 3600 * 1000);
}

function getVietnamDateStr() {
    return getVietnamNow().toISOString().slice(0, 10);
}

function getVietnamMonthStr() {
    return getVietnamNow().toISOString().slice(0, 7);
}

function getVietnamDateTimeDisplay() {
    const iso = getVietnamNow().toISOString();
    const [d, t] = iso.split('T');
    const [yyyy, mm, dd] = d.split('-');
    return `${dd}/${mm}/${yyyy} ${t.slice(0, 8)}`;
}

function getMonthDateRange(monthStr) {
    const match = /^(\d{4})-(\d{2})$/.exec(monthStr || '');
    const validMonth = match ? monthStr : getVietnamMonthStr();
    const [yearStr, monStr] = validMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monStr, 10); // 1..12
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = `${validMonth}-01`;
    const endDate = `${validMonth}-${String(lastDay).padStart(2, '0')}`;
    return {
        month: validMonth,
        year,
        monthNum: month,
        lastDay,
        startDate,
        endDate,
        startDateTime: `${startDate} 00:00:00`,
        endDateTime: `${endDate} 23:59:59`
    };
}

module.exports = {
    getVietnamDateStr,
    getVietnamMonthStr,
    getVietnamDateTimeDisplay,
    getMonthDateRange
};

