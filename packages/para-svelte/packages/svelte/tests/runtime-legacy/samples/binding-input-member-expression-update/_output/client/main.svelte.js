import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let values = $.prop($$props, 'values', 28, () => ({ a: 'abc', b: 'def' }));
	let paths = $.prop($$props, 'paths', 28, () => ['a']);
	let logs = $.prop($$props, 'logs', 28, () => []);

	$.legacy_pre_effect(() => ($.deep_read_state(paths()), $.deep_read_state(logs())), () => {
		paths() && logs().push('paths updated');
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
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

	var input = root();

	$.remove_input_defaults(input);
	$.bind_value(input, () => values()[paths()[0]], ($$value) => values(values()[paths()[0]] = $$value, true));
	$.append($$anchor, input);

	return $.pop($$exports);
}