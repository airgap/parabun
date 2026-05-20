import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Top from './Top.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let top = $.prop($$props, 'top', 12);
	let visible = $.prop($$props, 'visible', 12, true);

	var $$exports = {
		get top() {
			return top();
		},

		set top($$value) {
			top($$value);
			$.flush();
		},

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
			$.bind_this(Top($$anchor, { $$legacy: true }), ($$value) => top($$value), () => top());
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}