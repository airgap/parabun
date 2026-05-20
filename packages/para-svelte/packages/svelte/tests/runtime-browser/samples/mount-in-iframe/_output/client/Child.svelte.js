import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';
import GrandChild from "./GrandChild.svelte";

var root = $.from_html(`<h1 class="svelte-bt9zrl"> </h1> <!>`, 1);
const $$css = { hash: 'svelte-bt9zrl', code: 'h1.svelte-bt9zrl {color:red;}' };

export default function _unknown_($$anchor, $$props) {
	$.append_styles($$anchor, $$css);

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1);

	$.reset(h1);

	var node = $.sibling(h1, 2);

	GrandChild(node, {
		get count() {
			return $$props.count;
		}
	});

	$.template_effect(() => $.set_text(text, `count: ${$$props.count ?? ''}`));
	$.append($$anchor, fragment);
}