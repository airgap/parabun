import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<!> <!> <div> </div> <input/> <input/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var ref, value;

	var $$promises = $.run([
		() => Promise.resolve(),
		() => {
			ref = $.state(null);
			void $.user_effect(() => console.log(!!$.get(ref), $.get(value)));
			value = $.state('value');
		}
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, ($$anchor) => {
		Child(node, {
			get value() {
				return $.get(value);
			},

			set value($$value) {
				$.set(value, $$value, true);
			}
		});
	});

	var node_1 = $.sibling(node, 2);
	var bind_get = () => $.get(value);
	var bind_set = (v) => $.set(value, v, true);

	$.async(node_1, [$$promises[1]], void 0, ($$anchor) => {
		Child(node_1, {
			get value() {
				return bind_get();
			},

			set value($$value) {
				bind_set($$value);
			}
		});
	});

	var div = $.sibling(node_1, 2);
	var text = $.child(div, true);

	$.reset(div);

	$.run_after_blockers([$$promises[1]], () => {
		$.bind_this(div, ($$value) => $.set(ref, $$value), () => $.get(ref));
	});

	var input = $.sibling(div, 2);

	$.remove_input_defaults(input);

	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);
	$.template_effect(() => $.set_text(text, !!$.get(ref)), void 0, void 0, [$$promises[1]]);

	$.run_after_blockers([$$promises[1]], () => {
		$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));
	});

	$.run_after_blockers([$$promises[1]], () => {
		$.bind_value(input_1, () => $.get(value), (v) => $.set(value, v, true));
	});

	$.append($$anchor, fragment);
	$.pop();
}