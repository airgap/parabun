import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let logs = $.prop($$props, 'logs', 28, () => []);

	let click_1 = $.prop($$props, 'click_1', 12, () => {
		logs().push('click_1');
	});

	let click_2 = $.prop($$props, 'click_2', 12, () => {
		logs().push('click_2');
	});

	let click_3 = $.prop($$props, 'click_3', 12, () => {
		logs().push('click_3');
	});

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		},

		get click_1() {
			return click_1();
		},

		set click_1($$value) {
			click_1($$value);
			$.flush();
		},

		get click_2() {
			return click_2();
		},

		set click_2($$value) {
			click_2($$value);
			$.flush();
		},

		get click_3() {
			return click_3();
		},

		set click_3($$value) {
			click_3($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();

	$.event('click', button, function (...$$args) {
		click_1()?.apply(this, $$args);
	});

	$.event('click', button, $.stopImmediatePropagation(function (...$$args) {
		click_2()?.apply(this, $$args);
	}));

	$.event('click', button, function (...$$args) {
		click_3()?.apply(this, $$args);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}