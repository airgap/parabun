import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, true);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			A($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}