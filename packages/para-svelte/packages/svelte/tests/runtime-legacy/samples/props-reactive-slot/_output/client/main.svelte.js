import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Comp from './Comp.svelte';

var root_1 = $.from_html(`<h1> </h1>`);
var root = $.from_html(`<!> <button>Change</button>`, 1);

export default function Main($$anchor) {
	let p = $.mutable_source("hi");
	var fragment = root();
	var node = $.first_child(fragment);

	Comp(node, {
		get someprop() {
			return $.get(p);
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const props = $.derived_safe_equal(() => $$slotProps.props);
				var h1 = root_1();
				var text = $.child(h1, true);

				$.reset(h1);

				$.template_effect(() => $.set_text(text, (
					$.deep_read_state($.get(props)),
					$.untrack(() => $.get(props).someprop)
				)));

				$.append($$anchor, h1);
			}
		}
	});

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(p, "changed"));
	$.append($$anchor, fragment);
}