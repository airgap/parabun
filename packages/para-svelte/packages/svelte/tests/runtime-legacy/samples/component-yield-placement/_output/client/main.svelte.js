import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Modal from './Modal.svelte';

var root_2 = $.from_html(`<h2>Hello!</h2>`);
var root_3 = $.from_html(`<button>show modal</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let showModal = $.prop($$props, 'showModal', 12);

	var $$exports = {
		get showModal() {
			return showModal();
		},

		set showModal($$value) {
			showModal($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Modal($$anchor, {
				$$events: { destroy: () => showModal(false) },
				children: ($$anchor, $$slotProps) => {
					var h2 = root_2();

					$.append($$anchor, h2);
				},
				$$slots: { default: true }
			});
		};

		var alternate = ($$anchor) => {
			var button = root_3();

			$.event('click', button, () => showModal(true));
			$.append($$anchor, button);
		};

		$.if(node, ($$render) => {
			if (showModal()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}