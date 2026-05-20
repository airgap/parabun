import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);

	/**
	 * @param {Element} _
	 * @param {number} count
	 */
	function action(_, count) {
		return {
			count,
			/** @param {number} count */
			update(count) {
				console.log('update', this.count, this.count = count);
			},

			destroy() {
				console.log('destroy', this.count);
			}
		};
	}

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var button = root_1();
			var text = $.child(button, true);

			$.reset(button);
			$.action(button, ($$node, $$action_arg) => action?.($$node, $$action_arg), () => $.get(count));
			$.template_effect(() => $.set_text(text, $.get(count)));
			$.delegated('click', button, () => $.update(count));
			$.append($$anchor, button);
		};

		$.if(node, ($$render) => {
			if ($.get(count) < 2) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);