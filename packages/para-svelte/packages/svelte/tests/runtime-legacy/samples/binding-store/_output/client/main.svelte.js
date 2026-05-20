import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<input/> <p> </p> <textarea></textarea> <div contenteditable="true"></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $name = () => $.store_get(name, '$name', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const name = writable('world');
	var $$exports = { name };

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);

	var textarea = $.sibling(p, 2);

	$.remove_textarea_child(textarea);

	var div = $.sibling(textarea, 2);

	$.template_effect(() => $.set_text(text, `hello ${$name() ?? ''}`));
	$.bind_value(input, $name, ($$value) => $.store_set(name, $$value));
	$.bind_value(textarea, $name, ($$value) => $.store_set(name, $$value));
	$.bind_content_editable('innerHTML', div, $name, ($$value) => $.store_set(name, $$value));
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'name', name);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}