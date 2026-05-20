import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>mutate</button> <button>reassign</button> <div> </div>`, 1);

export default function Main($$anchor) {
	let foo = $.state($.proxy({ count: 0 }));
	let count = $.state(0);

	function action() {
		return {
			update(foo) {
				$.set(count, foo.count, true);
			}
		};
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var div = $.sibling(button_1, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.action(div, ($$node, $$action_arg) => action?.($$node, $$action_arg), () => $.get(foo));
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.delegated('click', button, () => $.get(foo).count++);
	$.delegated('click', button_1, () => $.set(foo, { ...$.get(foo), count: $.get(foo).count + 1 }, true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);