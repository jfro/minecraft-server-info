jQuery.fn.time_from_seconds = function() {
	return this.each(function() {
		var t = parseInt($(this).text(), 10);
		$(this).data('original', t);
		var h = Math.floor(t / 3600);
		t %= 3600;
		var m = Math.floor(t / 60);
		var s = Math.floor(t % 60);
		$(this).text((h > 0 ? h + 'h' + ((h > 1) ? '' : ' ') : '') +
			(m > 0 ? m + 'm' + ((m > 1) ? '' : ' ') : '') +
			s + 's' + ((s > 1) ? '' : ''));
	});
};
