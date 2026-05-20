import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Input from './Input.svelte';

var root = $.from_html(`<input/> <!> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $value = () => $.store_get(value, '$value', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let value = writable({ value: '' });
	let callback = $.prop($$props, 'callback', 12, () => {});

	value.subscribe(() => {
		callback()();
	});

	var $$exports = {
		get callback() {
			return callback();
		},

		set callback($$value) {
			callback($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var node = $.sibling(input, 2);

	Input(node, {
		get value() {
			return $value().value;
		},

		set value($$value) {
			$.store_mutate(value, $.untrack($value).value = $$value, $.untrack($value));
		},
		$$legacy: true
	});

	var div = $.sibling(node, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, ($value(), $.untrack(() => $value().value))));
	$.bind_value(input, () => $value().value, ($$value) => $.store_mutate(value, $.untrack($value).value = $$value, $.untrack($value)));
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}