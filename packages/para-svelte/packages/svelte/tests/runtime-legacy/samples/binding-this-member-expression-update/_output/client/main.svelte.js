import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let container = $.prop($$props, 'container', 28, () => ({}));
	let paths = $.prop($$props, 'paths', 28, () => ['a']);
	let logs = $.prop($$props, 'logs', 28, () => []);

	$.legacy_pre_effect(() => ($.deep_read_state(paths()), $.deep_read_state(logs())), () => {
		paths() && logs().push('paths updated');
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get container() {
			return container();
		},

		set container($$value) {
			container($$value);
			$.flush();
		},

		get paths() {
			return paths();
		},

		set paths($$value) {
			paths($$value);
			$.flush();
		},

		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();

	$.bind_this(div, ($$value) => container(container()[paths()[0]] = $$value, true), () => container()?.[paths()[0]]);
	$.append($$anchor, div);

	return $.pop($$exports);
}